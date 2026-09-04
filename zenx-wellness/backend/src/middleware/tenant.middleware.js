import env from '../config/env.js'
import prisma from '../config/prisma.js'
import { ApiError, forbidden } from '../utils/ApiError.js'
import asyncHandler from '../utils/asyncHandler.js'
import { isValidSubdomain, RESERVED_SUBDOMAINS } from '../utils/subdomain.js'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

/** Strips the port and normalises the Host header. */
const normaliseHost = (hostHeader) =>
  String(hostHeader || '')
    .toLowerCase()
    .trim()
    .replace(/:\d+$/, '')

/**
 * Extracts the tenant label from a host, or null when the host addresses the
 * ZenX platform itself. Returns `undefined` for a host we don't recognise.
 */
export const parseTenantLabel = (hostHeader) => {
  const host = normaliseHost(hostHeader)
  if (!host) return null

  if (LOCAL_HOSTS.has(host)) return null

  // <label>.localhost — browsers resolve these, so tenants work in local dev.
  if (host.endsWith('.localhost')) {
    const label = host.slice(0, -'.localhost'.length)
    return env.platformHosts.includes(label) ? null : label
  }

  if (host === env.appDomain) return null

  if (host.endsWith(`.${env.appDomain}`)) {
    const label = host.slice(0, -(env.appDomain.length + 1))
    // Only a single label is a tenant; anything deeper is not a workspace.
    if (label.includes('.')) return undefined
    return env.platformHosts.includes(label) ? null : label
  }

  // An unrelated host (a bare IP, a preview domain) is treated as platform.
  return null
}

/**
 * Resolves the customer company for the request from its subdomain and hangs
 * it off `req.tenant`. Platform hosts resolve to `req.tenant === null`.
 *
 * This is the only trusted source of companyId — a body, query or token claim
 * is never used to pick a tenant.
 */
export const resolveTenant = asyncHandler(async (req, _res, next) => {
  let label = parseTenantLabel(req.headers.host)

  // Local development can't serve real subdomains everywhere, so allow an
  // explicit override. Never outside development: it would be a tenant bypass.
  if (!env.isProduction) {
    const override = req.headers['x-tenant-subdomain']
    if (typeof override === 'string' && override.trim()) {
      label = override.trim().toLowerCase()
    }
  }

  if (label === undefined) {
    throw new ApiError(404, 'Unknown workspace')
  }

  if (label === null) {
    req.tenant = null
    return next()
  }

  if (!isValidSubdomain(label) || RESERVED_SUBDOMAINS.has(label)) {
    throw new ApiError(404, 'Unknown workspace')
  }

  const domain = await prisma.companyDomain.findUnique({
    where: { subdomain: label },
    include: { company: true },
  })

  if (!domain || !domain.isActive || !domain.company) {
    throw new ApiError(404, 'Unknown workspace')
  }

  if (domain.company.accountStatus !== 'ACTIVE') {
    throw forbidden('This workspace is currently inactive')
  }

  req.tenant = {
    companyId: domain.company.id,
    subdomain: domain.subdomain,
    company: {
      id: domain.company.id,
      name: domain.company.name,
      slug: domain.company.slug,
      logoUrl: domain.company.logoUrl,
      timezone: domain.company.timezone,
      country: domain.company.country,
      accountStatus: domain.company.accountStatus,
    },
  }

  next()
})

/** Customer routes: a resolved tenant is mandatory. */
export const requireTenant = (req, _res, next) => {
  if (!req.tenant) {
    return next(new ApiError(404, 'Unknown workspace'))
  }
  next()
}

/**
 * Platform routes: must be reached from a ZenX host, never from a customer
 * subdomain. Keeps the platform surface structurally separate from tenants.
 */
export const platformOnly = (req, _res, next) => {
  if (req.tenant) {
    return next(forbidden('Platform administration is not available on a company workspace'))
  }
  next()
}
