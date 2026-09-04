/**
 * End-to-end exercise of the Phase 2A platform surface, run against an
 * in-process app instance. Verifies the enquiry pipeline, conversion, and the
 * tenant-isolation guarantees that the golden rule depends on.
 */
import app from '../src/app.js'
import prisma from '../src/config/prisma.js'

const PLATFORM_HOST = 'admin.dietitian.zenxitsolutions.com'
let base
let pass = 0
let fail = 0

const check = (label, condition, detail = '') => {
  if (condition) {
    pass += 1
    console.log(`  PASS  ${label}`)
  } else {
    fail += 1
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const call = async (method, path, { token, host = PLATFORM_HOST, body, tenant } = {}) => {
  const headers = { 'Content-Type': 'application/json', Host: host }
  if (token) headers.Authorization = `Bearer ${token}`
  if (tenant) headers['X-Tenant-Subdomain'] = tenant

  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  let parsed
  try {
    parsed = await res.json()
  } catch {
    // Not every response carries a JSON body.
  }
  return { status: res.status, body: parsed ?? null }
}

const run = async () => {
  console.log('\n== auth on the platform host ==')
  const login = await call('POST', '/api/auth/login', {
    body: { email: 'admin@zenx.com', password: 'Admin@12345' },
  })
  check('super admin can sign in', login.status === 200, `got ${login.status}`)
  const token = login.body?.data?.token
  if (!token) {
    console.error('cannot continue without a token')
    process.exitCode = 1
    return
  }

  const unauth = await call('GET', '/api/platform/enquiries')
  check('platform routes reject anonymous', unauth.status === 401, `got ${unauth.status}`)

  console.log('\n== plans ==')
  const plans = await call('GET', '/api/platform/plans', { token })
  check('plans list', plans.status === 200 && plans.body.data.length >= 3)
  const planId = plans.body?.data?.[0]?.id

  const dupPlan = await call('POST', '/api/platform/plans', {
    token,
    body: { name: 'Starter', features: {} },
  })
  check('duplicate plan name rejected', dupPlan.status === 400, `got ${dupPlan.status}`)

  console.log('\n== enquiry pipeline ==')
  const created = await call('POST', '/api/platform/enquiries', {
    token,
    body: {
      companyName: 'FitLife Wellness',
      contactName: 'Dana Rivera',
      email: `dana.${Date.now()}@fitlife.test`,
      phone: '+1 555 0142',
      source: 'Website',
    },
  })
  check('create enquiry', created.status === 201, JSON.stringify(created.body))
  const enquiryId = created.body?.data?.id

  const badEnquiry = await call('POST', '/api/platform/enquiries', {
    token,
    body: { companyName: 'X', contactName: '', email: 'nope' },
  })
  check('invalid enquiry rejected with field errors', badEnquiry.status === 400 && badEnquiry.body.errors)

  const assignees = await call('GET', '/api/platform/enquiries/assignees', { token })
  check('assignees list', assignees.status === 200 && assignees.body.data.length >= 1)
  const adminId = assignees.body?.data?.[0]?.id

  const assigned = await call('PATCH', `/api/platform/enquiries/${enquiryId}/assign`, {
    token,
    body: { assignedToId: adminId },
  })
  check('assign enquiry', assigned.status === 200 && assigned.body.data.assignedToId === adminId)

  const contacted = await call('PATCH', `/api/platform/enquiries/${enquiryId}`, {
    token,
    body: { status: 'CONTACTED' },
  })
  check('status -> CONTACTED', contacted.status === 200 && contacted.body.data.status === 'CONTACTED')

  const forcedConvert = await call('PATCH', `/api/platform/enquiries/${enquiryId}`, {
    token,
    body: { status: 'CONVERTED' },
  })
  check('CONVERTED cannot be set by plain update', forcedConvert.status === 400, `got ${forcedConvert.status}`)

  const comment = await call('POST', `/api/platform/enquiries/${enquiryId}/comments`, {
    token,
    body: { body: 'Left a voicemail, calling back Thursday.' },
  })
  check('add comment', comment.status === 201 && comment.body.data.author?.id === adminId)

  const followUp = await call('POST', `/api/platform/enquiries/${enquiryId}/followups`, {
    token,
    body: {
      dueAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      timezone: 'America/Chicago',
      remindAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      notes: 'Discuss Growth plan pricing.',
    },
  })
  check('schedule follow-up', followUp.status === 201, JSON.stringify(followUp.body))
  const followUpId = followUp.body?.data?.id

  const afterFollowUp = await call('GET', `/api/platform/enquiries/${enquiryId}`, { token })
  check('follow-up moves status to FOLLOW_UP', afterFollowUp.body?.data?.status === 'FOLLOW_UP')

  const badZone = await call('POST', `/api/platform/enquiries/${enquiryId}/followups`, {
    token,
    body: { dueAt: new Date(Date.now() + 86400000).toISOString(), timezone: 'GMT+5:30' },
  })
  check('fixed-offset timezone rejected', badZone.status === 400, `got ${badZone.status}`)

  const completed = await call('PATCH', `/api/platform/enquiries/${enquiryId}/followups/${followUpId}`, {
    token,
    body: { status: 'COMPLETED', outcome: 'Agreed to proceed.' },
  })
  check('complete follow-up sets completedAt', completed.status === 200 && completed.body.data.completedAt)

  console.log('\n== conversion ==')
  const convert = await call('POST', `/api/platform/enquiries/${enquiryId}/convert`, {
    token,
    body: {
      country: 'United States',
      timezone: 'America/Chicago',
      planId,
      subStartDate: new Date().toISOString(),
      subEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      admin: {
        firstName: 'Dana',
        lastName: 'Rivera',
        email: `dana.admin.${Date.now()}@fitlife.test`,
        username: `dana_${Date.now()}`,
      },
    },
  })
  check('convert enquiry', convert.status === 201, JSON.stringify(convert.body).slice(0, 300))

  const subdomain = convert.body?.data?.subdomain
  const companyId = convert.body?.data?.company?.id
  const tempPassword = convert.body?.data?.temporaryPassword
  const adminEmail = convert.body?.data?.admin?.email

  check('subdomain derived from company name', subdomain?.startsWith('fitlife-wellness'), subdomain)
  check('temporary password returned once', typeof tempPassword === 'string' && tempPassword.length >= 12)
  check('company has a subscription', convert.body?.data?.company?.subscriptions?.length === 1)
  check('company has a primary domain', convert.body?.data?.company?.domains?.[0]?.isPrimary === true)

  const reconvert = await call('POST', `/api/platform/enquiries/${enquiryId}/convert`, {
    token,
    body: {
      country: 'United States',
      timezone: 'America/Chicago',
      planId,
      subStartDate: new Date().toISOString(),
      subEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      admin: {
        firstName: 'Dupe',
        lastName: 'Attempt',
        email: `dupe.${Date.now()}@fitlife.test`,
        username: `dupe_${Date.now()}`,
      },
    },
  })
  check('double conversion rejected', reconvert.status === 400, `got ${reconvert.status}`)

  console.log('\n== tenant isolation ==')
  const tenantLogin = await call('POST', '/api/auth/login', {
    tenant: subdomain,
    body: { email: adminEmail, password: tempPassword },
  })
  check('company admin signs in on their own subdomain', tenantLogin.status === 200, JSON.stringify(tenantLogin.body))
  const tenantToken = tenantLogin.body?.data?.token
  check('mustChangePassword flagged', tenantLogin.body?.data?.user?.mustChangePassword === true)

  const superOnTenant = await call('POST', '/api/auth/login', {
    tenant: subdomain,
    body: { email: 'admin@zenx.com', password: 'Admin@12345' },
  })
  check('super admin cannot sign in on a company subdomain', superOnTenant.status === 401, `got ${superOnTenant.status}`)

  const tenantOnPlatform = await call('POST', '/api/auth/login', {
    body: { email: adminEmail, password: tempPassword },
  })
  check('company admin cannot sign in on the platform host', tenantOnPlatform.status === 401, `got ${tenantOnPlatform.status}`)

  const tenantHitsPlatform = await call('GET', '/api/platform/companies', {
    token: tenantToken,
    tenant: subdomain,
  })
  check('company token cannot reach platform routes', tenantHitsPlatform.status === 403, `got ${tenantHitsPlatform.status}`)

  const replay = await call('GET', '/api/auth/me', { token: tenantToken })
  check('company token replayed on platform host is refused', replay.status === 403, `got ${replay.status}`)

  const superOnTenantHost = await call('GET', '/api/auth/me', { token, tenant: subdomain })
  check('platform token replayed on a company host is refused', superOnTenantHost.status === 403, `got ${superOnTenantHost.status}`)

  const unknownTenant = await call('GET', '/api/auth/context', { tenant: 'does-not-exist' })
  check('unknown subdomain is 404', unknownTenant.status === 404, `got ${unknownTenant.status}`)

  const reservedTenant = await call('GET', '/api/auth/context', { tenant: 'api' })
  check('reserved subdomain is 404', reservedTenant.status === 404, `got ${reservedTenant.status}`)

  const context = await call('GET', '/api/auth/context', { tenant: subdomain })
  check('branding context served for the tenant', context.status === 200 && context.body.data.tenant?.name === 'FitLife Wellness')

  console.log('\n== company deactivation ==')
  const deactivated = await call('PATCH', `/api/platform/companies/${companyId}/status`, {
    token,
    body: { accountStatus: 'INACTIVE' },
  })
  check('deactivate company', deactivated.status === 200)

  const blocked = await call('GET', '/api/auth/me', { token: tenantToken, tenant: subdomain })
  check('inactive company blocks its whole workspace', blocked.status === 403, `got ${blocked.status}`)

  await call('PATCH', `/api/platform/companies/${companyId}/status`, {
    token,
    body: { accountStatus: 'ACTIVE' },
  })
  const restored = await call('GET', '/api/auth/me', { token: tenantToken, tenant: subdomain })
  check('reactivation restores access', restored.status === 200, `got ${restored.status}`)

  console.log('\n== second company: subdomain collision + cross-tenant ==')
  const second = await call('POST', '/api/platform/companies', {
    token,
    body: {
      name: 'FitLife Wellness',
      email: `ops.${Date.now()}@fitlife2.test`,
      country: 'India',
      timezone: 'Asia/Kolkata',
      planId,
      subStartDate: new Date().toISOString(),
      subEndDate: new Date(Date.now() + 180 * 86400000).toISOString(),
      admin: {
        firstName: 'Ravi',
        lastName: 'Kumar',
        email: `ravi.${Date.now()}@fitlife2.test`,
        username: `ravi_${Date.now()}`,
      },
    },
  })
  check('create second company directly', second.status === 201, JSON.stringify(second.body).slice(0, 300))
  const secondSubdomain = second.body?.data?.subdomain
  check('colliding name gets a distinct subdomain', secondSubdomain && secondSubdomain !== subdomain, `${subdomain} vs ${secondSubdomain}`)

  const crossTenant = await call('GET', '/api/auth/me', { token: tenantToken, tenant: secondSubdomain })
  check("company A's token refused on company B's subdomain", crossTenant.status === 403, `got ${crossTenant.status}`)

  console.log('\n== timezone storage ==')
  const stored = await prisma.platformFollowUp.findUnique({ where: { id: followUpId } })
  check('follow-up stores an IANA zone', stored?.timezone === 'America/Chicago')
  check('follow-up stores a real instant', stored?.dueAt instanceof Date)

  console.log(`\n${pass} passed, ${fail} failed\n`)
  if (fail > 0) process.exitCode = 1
}

const server = app.listen(0, async () => {
  base = `http://127.0.0.1:${server.address().port}`
  try {
    await run()
  } catch (error) {
    console.error('smoke run threw:', error)
    process.exitCode = 1
  } finally {
    server.close()
    await prisma.$disconnect()
  }
})
