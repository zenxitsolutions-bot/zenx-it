import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import jwt from 'jsonwebtoken'
import env from '../config/env.js'
import prisma from '../config/prisma.js'
import { passwordResetEmail } from '../emails/passwordReset.js'
import { sendEmail } from './email.service.js'
import { badRequest, forbidden, unauthorized } from '../utils/ApiError.js'

/** Roles that may sign in on a ZenX platform host (no tenant). */
const PLATFORM_ROLES = ['SUPER_ADMIN']

const INVALID_CREDENTIALS = 'Invalid email or password'
const INACTIVE_ACCOUNT = 'Account is currently inactive'

// Comparing against a real-shaped hash keeps the unknown-email path roughly as
// slow as the known-email path, so responses don't leak which emails exist.
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8HrhL7Vt4jVQ8p6WQ9x0Vv1qFV5X0S'

/** Strips the password hash before a user ever leaves the service layer. */
export const toPublicUser = (user) => ({
  id: user.id,
  companyId: user.companyId,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  username: user.username,
  phone: user.phone,
  role: user.role,
  status: user.status,
  mustChangePassword: user.mustChangePassword,
  timezone: user.timezone,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, env.jwtSecret)
  } catch {
    throw unauthorized('Session expired. Please sign in again.')
  }
}

/**
 * Looks a user up inside one tenant. Emails are unique per company, so the
 * companyId is part of the lookup — a platform admin (companyId null) can
 * never be found from a company workspace, or vice versa.
 */
const findUserForTenant = async (email, companyId) => {
  if (companyId === null) {
    // Prisma can't use a compound unique when part of it is NULL.
    return prisma.user.findFirst({ where: { email, companyId: null } })
  }

  return prisma.user.findUnique({
    where: { companyId_email: { companyId, email } },
  })
}

/**
 * @param credentials  validated email + password
 * @param companyId    tenant resolved from the subdomain, or null for platform
 */
export const login = async ({ email, password }, companyId = null) => {
  const user = await findUserForTenant(email, companyId)

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH)
    throw unauthorized(INVALID_CREDENTIALS)
  }

  if (user.status !== 'ACTIVE') {
    throw forbidden(INACTIVE_ACCOUNT)
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    throw unauthorized(INVALID_CREDENTIALS)
  }

  // Platform hosts admit only ZenX staff; company hosts admit only that
  // company's users, which findUserForTenant has already guaranteed.
  if (companyId === null && !PLATFORM_ROLES.includes(user.role)) {
    throw forbidden('You do not have access to this portal')
  }

  return { user: toPublicUser(user), token: signToken(user) }
}

/** Loads the user behind a verified token and re-checks that they are still active. */
export const getActiveUserById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) throw unauthorized('Session is no longer valid')
  if (user.status !== 'ACTIVE') throw forbidden(INACTIVE_ACCOUNT)
  return toPublicUser(user)
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

/** The table stores only this digest, so a stolen row can't be turned into a link. */
const hashToken = (token) => createHash('sha256').update(token).digest('hex')

/**
 * Issues a reset ticket and emails the link.
 *
 * The response never says whether the address exists — an unknown email, an
 * inactive account and a real user all return the same shape, so this endpoint
 * can't be used to enumerate accounts.
 *
 * @param companyId  tenant from the subdomain, or null on a platform host
 * @param origin     where the link should point (the user's own workspace)
 */
export const requestPasswordReset = async ({ email }, companyId = null, context = {}) => {
  const user = await findUserForTenant(email, companyId)

  if (!user || user.status !== 'ACTIVE') return { delivered: false }

  // Platform hosts only reset ZenX staff accounts, mirroring the login rule.
  if (companyId === null && !PLATFORM_ROLES.includes(user.role)) return { delivered: false }

  // Any earlier link for this user stops working the moment a new one is sent.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = randomBytes(32).toString('hex')
  const expiresInMinutes = env.passwordResetTtlMinutes

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000),
    },
  })

  const origin = (context.origin || env.clientUrls[0]).replace(/\/$/, '')
  const resetUrl = `${origin}/reset-password?token=${token}`
  const workspaceName = context.workspaceName || 'ZenX Wellness'

  const { subject, html, text } = passwordResetEmail({
    firstName: user.firstName,
    resetUrl,
    workspaceName,
    expiresInMinutes,
  })

  const result = await sendEmail({ to: user.email, subject, html, text })

  // Without a mail provider configured the link would otherwise be lost.
  if (result.skipped) console.warn(`[auth] password reset link for ${user.email}: ${resetUrl}`)

  return { delivered: result.delivered }
}

/** Loads a reset ticket that is still live, or throws the same error for every failure mode. */
const findLiveResetToken = async (token) => {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw badRequest('This reset link is invalid or has expired. Please request a new one.')
  }

  if (record.user.status !== 'ACTIVE') throw forbidden(INACTIVE_ACCOUNT)

  return record
}

/** Cheap pre-flight so the reset screen can fail before the user types a password. */
export const verifyPasswordResetToken = async (token) => {
  const record = await findLiveResetToken(token)
  return { email: record.user.email, firstName: record.user.firstName }
}

/** Consumes the ticket and sets the new password. */
export const resetPasswordWithToken = async ({ token, password }) => {
  const record = await findLiveResetToken(token)
  const passwordHash = await bcrypt.hash(password, 10)

  // One transaction: the ticket is burned in the same breath as the password
  // change, so a replayed request can never land a second time.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, mustChangePassword: false },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ])

  return { email: record.user.email }
}
