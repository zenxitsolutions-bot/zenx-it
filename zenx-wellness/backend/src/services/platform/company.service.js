import bcrypt from 'bcryptjs'
import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { generateTemporaryPassword } from '../../utils/password.js'
import { generateUniqueSubdomain, isValidSubdomain, RESERVED_SUBDOMAINS } from '../../utils/subdomain.js'
import { assignRoleToUser, seedCompanyRoles } from '../app/rbac.service.js'

const companyInclude = {
  domains: { orderBy: { isPrimary: 'desc' } },
  subscriptions: {
    include: { plan: { select: { id: true, name: true, features: true } } },
    orderBy: { createdAt: 'desc' },
  },
}

const notFound = () => new ApiError(404, 'Company not found')

export const listCompanies = async ({ page = 1, pageSize = 20, search, accountStatus } = {}) => {
  const where = {
    ...(accountStatus ? { accountStatus } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { slug: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: companyInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.company.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getCompany = async (id) => {
  const company = await prisma.company.findUnique({ where: { id }, include: companyInclude })
  if (!company) throw notFound()
  return company
}

/** Resolves the subdomain to use, honouring an explicit override when given. */
const resolveSubdomain = async (client, companyName, requested) => {
  if (!requested) return generateUniqueSubdomain(companyName, client)

  if (!isValidSubdomain(requested) || RESERVED_SUBDOMAINS.has(requested)) {
    throw badRequest('That subdomain is not available', { subdomain: 'Not available' })
  }

  const taken = await client.companyDomain.findUnique({ where: { subdomain: requested } })
  if (taken) throw badRequest('That subdomain is already in use', { subdomain: 'Already in use' })

  return requested
}

/**
 * Creates a company together with its first Company Admin, its subdomain and
 * its opening subscription. All four succeed or none do — a company without a
 * reachable domain or an admin to sign in with is unusable.
 *
 * Returns the generated temporary password once; it is never stored in clear
 * text and cannot be read back afterwards.
 */
export const createCompany = async (payload, { tx } = {}) => {
  const run = async (client) => {
    const { admin, planId, subStartDate, subEndDate, subdomain: requestedSubdomain, ...company } = payload

    const plan = await client.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan) throw new ApiError(404, 'Subscription plan not found')

    const subdomain = await resolveSubdomain(client, company.name, requestedSubdomain)

    const usernameTaken = await client.user.findUnique({ where: { username: admin.username } })
    if (usernameTaken) {
      throw badRequest('That username is already taken', { 'admin.username': 'Already in use' })
    }

    const slugTaken = await client.company.findUnique({ where: { slug: subdomain } })
    const slug = slugTaken ? `${subdomain}-${Date.now().toString(36)}` : subdomain

    const created = await client.company.create({
      data: { ...company, slug, accountStatus: 'ACTIVE' },
    })

    await client.companyDomain.create({
      data: { companyId: created.id, subdomain, isPrimary: true, isActive: true },
    })

    await client.subscription.create({
      data: {
        companyId: created.id,
        planId,
        startDate: subStartDate,
        endDate: subEndDate,
        status: 'ACTIVE',
      },
    })

    const temporaryPassword = generateTemporaryPassword()
    const adminUser = await client.user.create({
      data: {
        companyId: created.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        username: admin.username,
        phone: admin.phone ?? null,
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        // Forces a reset on first sign-in.
        mustChangePassword: true,
        timezone: created.timezone,
      },
    })

    // Every company starts with the default role set, and its first admin is
    // given the Company Admin role so RBAC works from the first sign-in.
    const roles = await seedCompanyRoles(created.id, client)
    await assignRoleToUser(adminUser.id, roles['Company Admin'].id, client)

    return {
      company: await client.company.findUnique({ where: { id: created.id }, include: companyInclude }),
      admin: {
        id: adminUser.id,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role,
      },
      subdomain,
      temporaryPassword,
    }
  }

  return tx ? run(tx) : prisma.$transaction(run)
}

export const updateCompany = async (id, data) => {
  await getCompany(id)
  return prisma.company.update({ where: { id }, data, include: companyInclude })
}

/**
 * Companies are activated/deactivated, never deleted. A non-ACTIVE company is
 * refused by the tenant middleware, so its whole workspace goes dark at once.
 */
export const setCompanyStatus = async (id, accountStatus) => {
  await getCompany(id)
  return prisma.company.update({ where: { id }, data: { accountStatus }, include: companyInclude })
}
