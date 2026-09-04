import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { minutesOfDay, zonedParts, zonedTimeToUtc } from '../../utils/timezone.js'

/** Staff must exist in this company; a foreign id simply does not resolve. */
const assertStaff = async (companyId, userId) => {
  const user = await prisma.user.findFirst({ where: { id: userId, companyId } })
  if (!user) throw new ApiError(404, 'Staff member not found')
  return user
}

export const listAvailability = async (companyId, userId) => {
  await assertStaff(companyId, userId)
  return prisma.availability.findMany({
    where: { companyId, userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
}

const assertNoOverlap = (windows) => {
  const byDay = new Map()

  for (const window of windows) {
    const list = byDay.get(window.dayOfWeek) ?? []
    list.push(window)
    byDay.set(window.dayOfWeek, list)
  }

  for (const [dayOfWeek, list] of byDay) {
    const sorted = [...list].sort((a, b) => minutesOfDay(a.startTime) - minutesOfDay(b.startTime))

    for (let i = 0; i < sorted.length; i += 1) {
      const start = minutesOfDay(sorted[i].startTime)
      const end = minutesOfDay(sorted[i].endTime)

      if (end <= start) {
        throw badRequest('A window must end after it starts', {
          [`day${dayOfWeek}`]: `${sorted[i].startTime}-${sorted[i].endTime} is not a valid window`,
        })
      }

      if (i > 0 && start < minutesOfDay(sorted[i - 1].endTime)) {
        throw badRequest('Availability windows on the same day cannot overlap', {
          [`day${dayOfWeek}`]: `${sorted[i - 1].startTime}-${sorted[i - 1].endTime} overlaps ${sorted[i].startTime}-${sorted[i].endTime}`,
        })
      }
    }
  }
}

/**
 * Replaces a staff member's whole weekly pattern in one call — partial edits of
 * a recurring schedule are what produce orphaned or overlapping windows.
 */
export const setAvailability = async (companyId, userId, { timezone, windows }) => {
  await assertStaff(companyId, userId)
  assertNoOverlap(windows)

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { companyId, userId } }),
    ...(windows.length
      ? [
          prisma.availability.createMany({
            data: windows.map((window) => ({
              companyId,
              userId,
              dayOfWeek: window.dayOfWeek,
              startTime: window.startTime,
              endTime: window.endTime,
              timezone,
              isActive: window.isActive ?? true,
            })),
          }),
        ]
      : []),
  ])

  return listAvailability(companyId, userId)
}

export const listBlocks = async (companyId, userId, { from, to } = {}) => {
  await assertStaff(companyId, userId)
  return prisma.availabilityBlock.findMany({
    where: {
      companyId,
      userId,
      ...(from ? { endDate: { gte: from } } : {}),
      ...(to ? { startDate: { lte: to } } : {}),
    },
    orderBy: { startDate: 'asc' },
  })
}

export const createBlock = async (companyId, userId, data) => {
  await assertStaff(companyId, userId)

  if (data.endDate < data.startDate) {
    throw badRequest('Block end date must be on or after the start date', { endDate: 'Before start date' })
  }

  if (!data.isFullDay) {
    if (!data.startTime || !data.endTime) {
      throw badRequest('A partial-day block needs a start and end time', {
        startTime: 'Required for a partial-day block',
      })
    }
    if (minutesOfDay(data.endTime) <= minutesOfDay(data.startTime)) {
      throw badRequest('Block must end after it starts', { endTime: 'Before start time' })
    }
  }

  return prisma.availabilityBlock.create({ data: { ...data, companyId, userId } })
}

export const deleteBlock = async (companyId, userId, blockId) => {
  const block = await prisma.availabilityBlock.findFirst({ where: { id: blockId, companyId, userId } })
  if (!block) throw new ApiError(404, 'Block not found')

  await prisma.availabilityBlock.delete({ where: { id: blockId } })
  return { id: blockId }
}

const overlapsWindow = (startMin, endMin, windowStart, windowEnd) =>
  startMin < windowEnd && endMin > windowStart

/**
 * Is this staff member free for [instant, instant + durationMinutes)?
 *
 * The instant is a real UTC moment; it is read as wall-clock time in the zone
 * each window was declared in, so the answer stays correct across DST rather
 * than drifting by an hour twice a year.
 *
 * Phase 2D layers booked appointments on top of this — the shape is already
 * "does anything conflict", so that check slots straight in.
 */
export const isStaffAvailableAt = async (companyId, userId, instant, durationMinutes = 30) => {
  const [windows, blocks] = await Promise.all([
    prisma.availability.findMany({ where: { companyId, userId, isActive: true } }),
    prisma.availabilityBlock.findMany({ where: { companyId, userId } }),
  ])

  if (!windows.length) return { available: false, reason: 'NO_AVAILABILITY' }

  const start = instant instanceof Date ? instant : new Date(instant)
  const end = new Date(start.getTime() + durationMinutes * 60000)

  // A booking must sit inside one declared window, evaluated in that window's
  // own zone.
  const insideWindow = windows.some((window) => {
    const local = zonedParts(start, window.timezone)
    const localEnd = zonedParts(end, window.timezone)

    if (local.dayOfWeek !== window.dayOfWeek) return false
    // A slot that spills past midnight leaves the window by definition.
    if (localEnd.date !== local.date) return false

    const startMin = local.hour * 60 + local.minute
    const endMin = localEnd.hour * 60 + localEnd.minute

    return startMin >= minutesOfDay(window.startTime) && endMin <= minutesOfDay(window.endTime)
  })

  if (!insideWindow) return { available: false, reason: 'OUTSIDE_WORKING_HOURS' }

  const blocked = blocks.some((block) => {
    const local = zonedParts(start, block.timezone)
    const day = local.date

    const from = block.startDate.toISOString().slice(0, 10)
    const to = block.endDate.toISOString().slice(0, 10)
    if (day < from || day > to) return false

    if (block.isFullDay) return true

    const localEnd = zonedParts(end, block.timezone)
    return overlapsWindow(
      local.hour * 60 + local.minute,
      localEnd.hour * 60 + localEnd.minute,
      minutesOfDay(block.startTime),
      minutesOfDay(block.endTime),
    )
  })

  if (blocked) return { available: false, reason: 'BLOCKED' }

  return { available: true, reason: null }
}

/**
 * Concrete free slots on one calendar date, as UTC instants. This is the shape
 * the 2D scheduler walks when it materialises recurring calls.
 */
export const getSlotsForDate = async (companyId, userId, isoDate, durationMinutes = 30) => {
  const windows = await prisma.availability.findMany({
    where: { companyId, userId, isActive: true },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })

  const slots = []

  for (const window of windows) {
    // Which weekday isoDate falls on depends on the window's own zone.
    const probe = zonedTimeToUtc(isoDate, '12:00', window.timezone)
    if (zonedParts(probe, window.timezone).dayOfWeek !== window.dayOfWeek) continue

    const windowEnd = minutesOfDay(window.endTime)

    for (let minute = minutesOfDay(window.startTime); minute + durationMinutes <= windowEnd; minute += durationMinutes) {
      const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
      const startsAt = zonedTimeToUtc(isoDate, time, window.timezone)

      const { available } = await isStaffAvailableAt(companyId, userId, startsAt, durationMinutes)
      if (available) slots.push({ startsAt, localTime: time, timezone: window.timezone })
    }
  }

  return slots
}
