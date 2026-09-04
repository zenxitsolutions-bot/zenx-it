import prisma from '../config/prisma.js'

/**
 * Subdomains that must never belong to a customer tenant — either they address
 * ZenX itself or they collide with common infrastructure hostnames.
 */
export const RESERVED_SUBDOMAINS = new Set([
  'admin',
  'api',
  'app',
  'assets',
  'auth',
  'billing',
  'cdn',
  'dashboard',
  'dev',
  'ftp',
  'help',
  'localhost',
  'mail',
  'platform',
  'root',
  'smtp',
  'staging',
  'static',
  'status',
  'support',
  'test',
  'webmail',
  'www',
  'zenx',
])

/** Normalises a company name into a candidate subdomain label. */
export const slugify = (value) =>
  String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 63)

/** A valid DNS label: lowercase alphanumerics and inner hyphens, 3-63 chars. */
export const isValidSubdomain = (value) =>
  typeof value === 'string' && /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(value) && value.length >= 3

/**
 * Derives a globally unique subdomain from a company name, appending -2, -3…
 * until it is free. Reserved labels are pushed straight to a suffixed form.
 */
export const generateUniqueSubdomain = async (companyName, client = prisma) => {
  const base = slugify(companyName) || 'company'
  const seed = base.length < 3 ? `${base}-co` : base

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const candidate = attempt === 0 ? seed : `${seed}-${attempt + 1}`

    if (RESERVED_SUBDOMAINS.has(candidate)) continue
    if (!isValidSubdomain(candidate)) continue

    const taken = await client.companyDomain.findUnique({ where: { subdomain: candidate } })
    if (!taken) return candidate
  }

  throw new Error(`Could not derive a free subdomain for "${companyName}"`)
}
