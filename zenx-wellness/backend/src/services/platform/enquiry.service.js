import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { createCompany } from './company.service.js'

const adminSummary = {
  select: {
    id: true,
    designation: true,
    user: { select: { id: true, firstName: true, lastName: true, email: true } },
  },
}

const enquiryInclude = {
  assignedTo: adminSummary,
  convertedCompany: { select: { id: true, name: true, slug: true, accountStatus: true } },
  followUps: {
    include: { createdBy: adminSummary },
    orderBy: { dueAt: 'desc' },
  },
  comments: {
    include: { author: adminSummary },
    orderBy: { createdAt: 'desc' },
  },
}

const notFound = () => new ApiError(404, 'Enquiry not found')

const assertAssignee = async (assignedToId) => {
  if (!assignedToId) return
  const admin = await prisma.platformAdmin.findUnique({ where: { id: assignedToId } })
  if (!admin) throw badRequest('Assignee not found', { assignedToId: 'Unknown ZenX employee' })
  if (!admin.isActive) {
    throw badRequest('That employee is deactivated', { assignedToId: 'Employee is inactive' })
  }
}

export const listEnquiries = async ({ page = 1, pageSize = 20, search, status, assignedToId } = {}) => {
  const where = {
    ...(status ? { status } : {}),
    ...(assignedToId ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { companyName: { contains: search } },
            { contactName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.platformEnquiry.findMany({
      where,
      include: { assignedTo: adminSummary, convertedCompany: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.platformEnquiry.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getEnquiry = async (id) => {
  const enquiry = await prisma.platformEnquiry.findUnique({ where: { id }, include: enquiryInclude })
  if (!enquiry) throw notFound()
  return enquiry
}

export const createEnquiry = async (data) => {
  await assertAssignee(data.assignedToId)
  return prisma.platformEnquiry.create({ data, include: enquiryInclude })
}

export const updateEnquiry = async (id, data) => {
  const enquiry = await getEnquiry(id)

  // Conversion is a side-effecting flow of its own, not a status edit.
  if (enquiry.status === 'CONVERTED') {
    throw badRequest('A converted enquiry can no longer be edited')
  }

  if (data.assignedToId !== undefined) await assertAssignee(data.assignedToId)

  return prisma.platformEnquiry.update({ where: { id }, data, include: enquiryInclude })
}

export const assignEnquiry = async (id, assignedToId) => {
  await getEnquiry(id)
  await assertAssignee(assignedToId)
  return prisma.platformEnquiry.update({
    where: { id },
    data: { assignedToId },
    include: enquiryInclude,
  })
}

export const addComment = async (id, authorId, body) => {
  await getEnquiry(id)
  return prisma.platformEnquiryComment.create({
    data: { enquiryId: id, authorId, body },
    include: { author: adminSummary },
  })
}

export const listComments = async (id) => {
  await getEnquiry(id)
  return prisma.platformEnquiryComment.findMany({
    where: { enquiryId: id },
    include: { author: adminSummary },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Scheduling a follow-up also moves the enquiry into FOLLOW_UP, so the pipeline
 * status can't drift away from what is actually booked.
 */
export const scheduleFollowUp = async (id, createdById, data) => {
  const enquiry = await getEnquiry(id)
  if (enquiry.status === 'CONVERTED') {
    throw badRequest('A converted enquiry cannot take new follow-ups')
  }

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.platformFollowUp.create({
      data: { ...data, enquiryId: id, createdById },
      include: { createdBy: adminSummary },
    })

    if (enquiry.status === 'NEW' || enquiry.status === 'CONTACTED') {
      await tx.platformEnquiry.update({ where: { id }, data: { status: 'FOLLOW_UP' } })
    }

    return followUp
  })
}

export const listFollowUps = async (id) => {
  await getEnquiry(id)
  return prisma.platformFollowUp.findMany({
    where: { enquiryId: id },
    include: { createdBy: adminSummary },
    orderBy: { dueAt: 'desc' },
  })
}

export const updateFollowUp = async (enquiryId, followUpId, data) => {
  const followUp = await prisma.platformFollowUp.findFirst({ where: { id: followUpId, enquiryId } })
  if (!followUp) throw new ApiError(404, 'Follow-up not found')

  const patch = { ...data }
  if (data.status === 'COMPLETED' && !followUp.completedAt) {
    patch.completedAt = new Date()
  }
  if (data.status && data.status !== 'COMPLETED') {
    patch.completedAt = null
  }

  return prisma.platformFollowUp.update({
    where: { id: followUpId },
    data: patch,
    include: { createdBy: adminSummary },
  })
}

/** Follow-ups whose reminder is due and not yet sent — drives notifications. */
export const listDueReminders = async (now = new Date()) =>
  prisma.platformFollowUp.findMany({
    where: {
      status: 'SCHEDULED',
      reminderSentAt: null,
      remindAt: { not: null, lte: now },
    },
    include: { createdBy: adminSummary, enquiry: { select: { id: true, companyName: true } } },
    orderBy: { remindAt: 'asc' },
  })

/**
 * Converts a won enquiry into a live company. The company, its admin, its
 * subdomain, its subscription and the enquiry's own status all move together —
 * a half-converted enquiry would leave an unreachable tenant behind.
 */
export const convertEnquiry = async (id, payload) => {
  const enquiry = await getEnquiry(id)

  if (enquiry.status === 'CONVERTED' || enquiry.convertedCompanyId) {
    throw badRequest('This enquiry has already been converted')
  }
  if (enquiry.status === 'LOST' || enquiry.status === 'NOT_INTERESTED') {
    throw badRequest(`An enquiry marked ${enquiry.status} cannot be converted`)
  }

  return prisma.$transaction(async (tx) => {
    const result = await createCompany(
      {
        // The enquiry supplies the defaults; the payload may override them.
        name: payload.name ?? enquiry.companyName,
        email: payload.email ?? enquiry.email,
        phone: payload.phone ?? enquiry.phone ?? undefined,
        logoUrl: payload.logoUrl,
        address: payload.address,
        country: payload.country,
        timezone: payload.timezone,
        subdomain: payload.subdomain,
        planId: payload.planId,
        subStartDate: payload.subStartDate,
        subEndDate: payload.subEndDate,
        admin: payload.admin,
      },
      { tx },
    )

    await tx.platformEnquiry.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedCompanyId: result.company.id,
        convertedAt: new Date(),
      },
    })

    // Any open follow-up is moot once the deal is won.
    await tx.platformFollowUp.updateMany({
      where: { enquiryId: id, status: 'SCHEDULED' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    return result
  })
}
