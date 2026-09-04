/**
 * IANA zone ids only — never fixed offsets, so scheduling stays DST-correct.
 *
 * Intl is the source of truth for whether a zone exists, because
 * `Intl.supportedValuesOf('timeZone')` reports only the aliases a given runtime
 * happens to canonicalise to (Node lists `Asia/Calcutta` but not the modern
 * `Asia/Kolkata`), so matching against that list rejects valid ids.
 *
 * Intl on its own is too permissive though: it accepts `+05:30`, `-0800` and
 * `Etc/GMT+5`, all of which are frozen offsets that never observe DST. Those
 * are exactly what the timezone rule forbids, so they are screened out here.
 */

// Region/City, or Region/Area/City. Each segment starts with a capital, which
// keeps out lowercase spellings that Intl would otherwise silently accept.
const ZONE_SHAPE = /^[A-Z][A-Za-z0-9_+-]*(?:\/[A-Z][A-Za-z0-9_+-]*)+$/

// Zones that are really fixed offsets wearing an IANA-shaped name.
const FIXED_OFFSET = /^Etc\/(GMT|UTC[+-]|Universal|Zulu)/i

const ALWAYS_ALLOWED = new Set(['UTC', 'Etc/UTC'])

export const isValidTimezone = (value) => {
  if (typeof value !== 'string' || value !== value.trim() || !value) return false

  if (ALWAYS_ALLOWED.has(value)) return true

  // Bare offsets: "+05:30", "-0800".
  if (/^[+-]/.test(value)) return false
  if (FIXED_OFFSET.test(value)) return false
  if (!ZONE_SHAPE.test(value)) return false

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Formats a UTC instant for display in a given IANA zone. */
export const formatInZone = (date, timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date instanceof Date ? date : new Date(date))

/**
 * The zone's UTC offset, in milliseconds, at a given instant. Derived by asking
 * Intl what wall-clock time that instant reads as in the zone, so it accounts
 * for DST rather than assuming a fixed offset.
 */
const offsetAt = (instant, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(instant)
    .reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = Number(part.value)
      return acc
    }, {})

  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - instant.getTime()
}

/** Wall-clock fields for an instant, as read in the given zone. */
export const zonedParts = (instant, timeZone) => {
  const date = instant instanceof Date ? instant : new Date(instant)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value
      return acc
    }, {})

  const WEEKDAYS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    // ISO weekday: 1 = Monday through 7 = Sunday
    dayOfWeek: WEEKDAYS[parts.weekday],
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  }
}

/**
 * Converts a wall-clock date and time in a zone into the UTC instant it refers
 * to. Two passes: the first offset guess is re-evaluated at the resulting
 * instant, which settles the answer across a DST boundary where the offset on
 * either side differs.
 *
 * Ambiguous local times (the repeated hour when clocks go back) resolve to the
 * first occurrence; skipped times (the missing hour when clocks go forward)
 * resolve forward past the gap.
 */
export const zonedTimeToUtc = (isoDate, timeOfDay, timeZone) => {
  const [year, month, day] = String(isoDate).slice(0, 10).split('-').map(Number)
  const [hour, minute] = String(timeOfDay).split(':').map(Number)

  const naive = Date.UTC(year, month - 1, day, hour, minute)

  let instant = new Date(naive - offsetAt(new Date(naive), timeZone))
  instant = new Date(naive - offsetAt(instant, timeZone))

  return instant
}

/** "HH:mm" to minutes past midnight, for comparing wall-clock windows. */
export const minutesOfDay = (timeOfDay) => {
  const [hour, minute] = String(timeOfDay).split(':').map(Number)
  return hour * 60 + minute
}
