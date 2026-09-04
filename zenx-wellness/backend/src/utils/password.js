import { randomInt } from 'node:crypto'

// Ambiguous glyphs (O/0, l/1) are left out so a temporary password can be read
// aloud or copied from an email without confusion.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const LOWER = 'abcdefghijkmnopqrstuvwxyz'
const DIGITS = '23456789'
const SYMBOLS = '!@#$%&*?'
const ALL = UPPER + LOWER + DIGITS + SYMBOLS

const pick = (pool) => pool[randomInt(pool.length)]

/** Cryptographically random temporary password, one of each character class. */
export const generateTemporaryPassword = (length = 14) => {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)]

  while (chars.length < length) chars.push(pick(ALL))

  // Fisher-Yates, so the guaranteed classes aren't always in the first slots.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}
