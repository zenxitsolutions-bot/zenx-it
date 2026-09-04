import 'dotenv/config'

const required = (key) => {
  const value = process.env[key]
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value.trim()
}

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const nodeEnv = process.env.NODE_ENV || 'development'

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: Number(process.env.PORT) || 5000,
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // CLIENT_URL accepts one origin or a comma-separated list, so a dev server
  // that lands on a fallback port isn't blocked by CORS.
  clientUrls: list(process.env.CLIENT_URL, 'http://localhost:5173').map((origin) =>
    origin.replace(/\/$/, ''),
  ),
  // Tenant subdomains hang off this root: <subdomain>.<APP_DOMAIN>
  appDomain: (process.env.APP_DOMAIN || 'dietitian.zenxitsolutions.com').toLowerCase(),
  // Hosts that address the ZenX platform itself rather than a customer tenant.
  platformHosts: list(process.env.PLATFORM_HOSTS, 'admin,platform,www').map((host) =>
    host.toLowerCase(),
  ),
  // Transactional email (Resend). Without a key we log the reset link instead
  // of sending it, so local development still works.
  resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  // Must be an address on a domain verified in Resend. The shared
  // onboarding@resend.dev sender only delivers to the Resend account owner.
  mailFrom: (process.env.MAIL_FROM || 'ZenX Wellness <onboarding@resend.dev>').trim(),
  mailReplyTo: (process.env.MAIL_REPLY_TO || '').trim(),
  // How long a password-reset link stays usable.
  passwordResetTtlMinutes: Number(process.env.PASSWORD_RESET_TTL_MINUTES) || 60,
}

export default env
