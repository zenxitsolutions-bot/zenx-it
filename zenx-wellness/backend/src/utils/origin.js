import env from '../config/env.js'

/** Drops a trailing slash so origins compare cleanly. */
const normalise = (origin) => String(origin || '').trim().replace(/\/$/, '')

/**
 * Tenant subdomains vary per request, so the allow-list is matched rather than
 * enumerated: an exact CLIENT_URL entry, the app domain, or any subdomain of it.
 */
export const isAllowedOrigin = (origin) => {
  const candidate = normalise(origin)
  if (!candidate) return false
  if (env.clientUrls.includes(candidate)) return true

  try {
    const { hostname } = new URL(candidate)
    return hostname === env.appDomain || hostname.endsWith(`.${env.appDomain}`)
  } catch {
    return false
  }
}

/**
 * Where the browser-facing app lives for this request — used to build links we
 * put in emails. The request's own Origin is preferred (it is where the user
 * actually is), but only after it passes the allow-list, so a forged header
 * cannot turn a reset email into a phishing link.
 */
export const appOriginFor = (req) => {
  const origin = normalise(req?.headers?.origin)
  if (isAllowedOrigin(origin)) return origin

  const subdomain = req?.tenant?.subdomain
  if (subdomain && env.isProduction) return `https://${subdomain}.${env.appDomain}`

  return env.clientUrls[0]
}

export default { isAllowedOrigin, appOriginFor }
