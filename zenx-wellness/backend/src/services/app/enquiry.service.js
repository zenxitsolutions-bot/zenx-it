import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { createClient } from './client.service.js'

const staffSummary = { select: { id: true, firstName: true, lastName: true, email: true, role: true } }

const enquiryInclude = {
  assignedTo: staffSummary,
  convertedClient: { select: { id: true, firstName: true, lastName: true, status: true } },
  followUps: { include: { createdBy: staffSummary }, orderBy: { dueAt: 'desc' } },
  comments: { include: { author: staffSummary }, orderBy: { createdAt: 'desc' } },
}

const findScoped = async (companyId, id) => {
  const enquiry = await prisma.customerEnquiry.findFirst({
    where: { id, companyId },
    include: enquiryInclude,
  })
  if (!enquiry) throw new ApiError(404, 'Enquiry not found')
  return enquiry
}

const assertAssignee = async (companyId, assignedToId) => {
  if (!assignedToId) return
  const user = await prisma.user.findFirst({ where: { id: assignedToId, companyId } })
  if (!user) throw badRequest('That user is not in this workspace', { assignedToId: 'Unknown user' })
  if (user.status !== 'ACTIVE') {
    throw badRequest('That user is deactivated', { assignedToId: 'User is inactive' })
  }
}

export const listEnquiries = async (
  companyId,
  { page = 1, pageSize = 20, search, status, assignedToId } = {},
) => {
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(assignedToId ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma.customerEnquiry.findMany({
      where,
      include: { assignedTo: staffSummary, convertedClient: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.customerEnquiry.count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getEnquiry = async (companyId, id) => findScoped(companyId, id)

export const createEnquiry = async (companyId, data) => {
  await assertAssignee(companyId, data.assignedToId)
  return prisma.customerEnquiry.create({ data: { ...data, companyId }, include: enquiryInclude })
}

export const updateEnquiry = async (companyId, id, data) => {
  const enquiry = await findScoped(companyId, id)
  if (enquiry.status === 'CONVERTED') throw badRequest('A converted enquiry can no longer be edited')

  if (data.assignedToId !== undefined) await assertAssignee(companyId, data.assignedToId)

  return prisma.customerEnquiry.update({ where: { id }, data, include: enquiryInclude })
}

export const assignEnquiry = async (companyId, id, assignedToId) => {
  await findScoped(companyId, id)
  await assertAssignee(companyId, assignedToId)
  return prisma.customerEnquiry.update({ where: { id }, data: { assignedToId }, include: enquiryInclude })
}

export const listComments = async (companyId, id) => {
  await findScoped(companyId, id)
  return prisma.customerEnquiryComment.findMany({
    where: { companyId, enquiryId: id },
    include: { author: staffSummary },
    orderBy: { createdAt: 'desc' },
  })
}

export const addComment = async (companyId, id, authorId, body) => {
  await findScoped(companyId, id)
  return prisma.customerEnquiryComment.create({
    data: { companyId, enquiryId: id, authorId, body },
    include: { author: staffSummary },
  })
}

export const listFollowUps = async (companyId, id) => {
  await findScoped(companyId, id)
  return prisma.enquiryFollowUp.findMany({
    where: { companyId, enquiryId: id },
    include: { createdBy: staffSummary },
    orderBy: { dueAt: 'desc' },
  })
}

/** Booking a follow-up also advances the pipeline, so status matches reality. */
export const scheduleFollowUp = async (companyId, id, createdById, data) => {
  const enquiry = await findScoped(companyId, id)
  if (enquiry.status === 'CONVERTED') throw badRequest('A converted enquiry cannot take new follow-ups')

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.enquiryFollowUp.create({
      data: { ...data, companyId, enquiryId: id, createdById },
      include: { createdBy: staffSummary },
    })

    if (enquiry.status === 'NEW' || enquiry.status === 'CONTACTED') {
      await tx.customerEnquiry.update({ where: { id }, data: { status: 'FOLLOW_UP' } })
    }

    return followUp
  })
}

export const updateFollowUp = async (companyId, enquiryId, followUpId, data) => {
  const followUp = await prisma.enquiryFollowUp.findFirst({
    where: { id: followUpId, enquiryId, companyId },
  })
  if (!followUp) throw new ApiError(404, 'Follow-up not found')

  const patch = { ...data }
  if (data.status === 'COMPLETED' && !followUp.completedAt) patch.completedAt = new Date()
  if (data.status && data.status !== 'COMPLETED') patch.completedAt = null

  return prisma.enquiryFollowUp.update({
    where: { id: followUpId },
    data: patch,
    include: { createdBy: staffSummary },
  })
}

export const listDueReminders = async (companyId, now = new Date()) =>
  prisma.enquiryFollowUp.findMany({
    where: { companyId, status: 'SCHEDULED', reminderSentAt: null, remindAt: { not: null, lte: now } },
    include: { createdBy: staffSummary, enquiry: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { remindAt: 'asc' },
  })

/**
 * What the frontend seeds the Create Client form with. Read-only — converting
 * is a separate, explicit call.
 */
export const getConversionPrefill = async (companyId, id) => {
  const enquiry = await findScoped(companyId, id)

  if (enquiry.status === 'CONVERTED') throw badRequest('This enquiry has already been converted')

  return {
    enquiryId: enquiry.id,
    firstName: enquiry.firstName,
    lastName: enquiry.lastName,
    email: enquiry.email,
    phone: enquiry.phone,
    notes: enquiry.notes,
    assignedDietitianId: null,
    assignedTrainerId: null,
  }
}

/** Creates the client and closes the enquiry as one unit. */
export const convertEnquiry = async (companyId, id, payload) => {
  const enquiry = await findScoped(companyId, id)

  if (enquiry.status === 'CONVERTED' || enquiry.convertedClientId) {
    throw badRequest('This enquiry has already been converted')
  }
  if (enquiry.status === 'LOST' || enquiry.status === 'NOT_INTERESTED') {
    throw badRequest(`An enquiry marked ${enquiry.status} cannot be converted`)
  }

  return prisma.$transaction(async (tx) => {
    const client = await createClient(
      companyId,
      {
        ...payload,
        firstName: payload.firstName ?? enquiry.firstName,
        lastName: payload.lastName ?? enquiry.lastName,
        email: payload.email ?? enquiry.email ?? undefined,
        phone: payload.phone ?? enquiry.phone ?? undefined,
      },
      { tx },
    )

    await tx.customerEnquiry.update({
      where: { id },
      data: { status: 'CONVERTED', convertedClientId: client.id, convertedAt: new Date() },
    })

    await tx.enquiryFollowUp.updateMany({
      where: { enquiryId: id, status: 'SCHEDULED' },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    return client
  })
}
