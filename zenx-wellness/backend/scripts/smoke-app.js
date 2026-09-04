/**
 * End-to-end exercise of the Phase 2B customer surface: RBAC, users, clients
 * and the enquiry pipeline. Provisions two companies through the platform API
 * so cross-tenant isolation is tested against real, separate tenants.
 */
import app from '../src/app.js'
import prisma from '../src/config/prisma.js'
import { PERMISSION_KEYS } from '../src/constants/permissions.js'

// Derived, not hardcoded, so the catalog can grow without breaking the suite.
const CATALOG_SIZE = PERMISSION_KEYS.length

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

const call = async (method, path, { token, body, tenant } = {}) => {
  const headers = { 'Content-Type': 'application/json', Host: PLATFORM_HOST }
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

const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`

/** Provisions a company through the platform API and signs its admin in. */
const provision = async (platformToken, planId, name) => {
  const id = stamp()
  const created = await call('POST', '/api/platform/companies', {
    token: platformToken,
    body: {
      name,
      email: `ops.${id}@test.local`,
      country: 'United States',
      timezone: 'America/Chicago',
      planId,
      subStartDate: new Date().toISOString(),
      subEndDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      admin: {
        firstName: 'Ada',
        lastName: 'Admin',
        email: `ada.${id}@test.local`,
        username: `ada_${id}`,
      },
    },
  })

  if (created.status !== 201) throw new Error(`provision failed: ${JSON.stringify(created.body)}`)

  const { subdomain, temporaryPassword, admin } = created.body.data
  const login = await call('POST', '/api/auth/login', {
    tenant: subdomain,
    body: { email: admin.email, password: temporaryPassword },
  })

  return { subdomain, token: login.body?.data?.token, adminId: admin.id, companyId: created.body.data.company.id }
}

const run = async () => {
  const platformLogin = await call('POST', '/api/auth/login', {
    body: { email: 'admin@zenx.com', password: 'Admin@12345' },
  })
  const platformToken = platformLogin.body?.data?.token
  const plans = await call('GET', '/api/platform/plans', { token: platformToken })
  const planId = plans.body.data[0].id

  console.log('\n== provisioning two tenants ==')
  const a = await provision(platformToken, planId, `Acme Wellness ${stamp()}`)
  const b = await provision(platformToken, planId, `Beta Nutrition ${stamp()}`)
  check('company A admin signed in', Boolean(a.token))
  check('company B admin signed in', Boolean(b.token))

  const T = (extra = {}) => ({ token: a.token, tenant: a.subdomain, ...extra })

  console.log('\n== default roles seeded per company ==')
  const roles = await call('GET', '/api/app/roles', T())
  check('roles endpoint returns 200', roles.status === 200, JSON.stringify(roles.body).slice(0, 200))
  const roleNames = (roles.body?.data ?? []).map((role) => role.name).sort()
  check(
    'six default roles seeded',
    JSON.stringify(roleNames) ===
      JSON.stringify(['Client', 'Company Admin', 'Dietitian', 'Manager', 'Receptionist', 'Trainer']),
    roleNames.join(', '),
  )
  const adminRole = roles.body.data.find((role) => role.name === 'Company Admin')
  check(
    'Company Admin holds the full catalog',
    adminRole?.permissions.length === CATALOG_SIZE,
    `${adminRole?.permissions.length} of ${CATALOG_SIZE}`,
  )

  const permissions = await call('GET', '/api/app/roles/permissions', T())
  check(
    `permission catalog has ${CATALOG_SIZE} entries`,
    permissions.body?.data?.length === CATALOG_SIZE,
    `${permissions.body?.data?.length}`,
  )

  console.log('\n== RBAC enforcement ==')
  const dietitianRole = roles.body.data.find((role) => role.name === 'Dietitian')

  const staffId = stamp()
  const staff = await call('POST', '/api/app/users', {
    ...T(),
    body: {
      firstName: 'Dee',
      lastName: 'Dietitian',
      email: `dee.${staffId}@test.local`,
      username: `dee_${staffId}`,
      role: 'DIETITIAN',
      roleIds: [dietitianRole.id],
    },
  })
  check('create dietitian user', staff.status === 201, JSON.stringify(staff.body).slice(0, 200))
  const dietitianUserId = staff.body?.data?.user?.id
  const dietitianPassword = staff.body?.data?.temporaryPassword
  check('temporary password issued', typeof dietitianPassword === 'string')

  const dietLogin = await call('POST', '/api/auth/login', {
    tenant: a.subdomain,
    body: { email: staff.body.data.user.email, password: dietitianPassword },
  })
  const dietToken = dietLogin.body?.data?.token
  check('dietitian can sign in', dietLogin.status === 200)

  const D = (extra = {}) => ({ token: dietToken, tenant: a.subdomain, ...extra })

  const dietSeesClients = await call('GET', '/api/app/clients', D())
  check('dietitian has clients.view', dietSeesClients.status === 200, `got ${dietSeesClients.status}`)

  const dietMakesUser = await call('POST', '/api/app/users', {
    ...D(),
    body: {
      firstName: 'No',
      lastName: 'Way',
      email: `no.${stamp()}@test.local`,
      role: 'TRAINER',
    },
  })
  check('dietitian blocked from users.create', dietMakesUser.status === 403, `got ${dietMakesUser.status}`)

  const dietMakesRole = await call('POST', '/api/app/roles', {
    ...D(),
    body: { name: 'Sneaky', permissions: [] },
  })
  check('dietitian blocked from roles.create', dietMakesRole.status === 403, `got ${dietMakesRole.status}`)

  const dietPayments = await call('GET', '/api/app/dashboard/summary', D())
  check('dietitian has dashboard.view', dietPayments.status === 200, `got ${dietPayments.status}`)

  console.log('\n== custom roles ==')
  const custom = await call('POST', '/api/app/roles', {
    ...T(),
    body: { name: 'Front Desk', description: 'Reception only', permissions: ['clients.view', 'enquiries.view'] },
  })
  check('create custom role', custom.status === 201, JSON.stringify(custom.body).slice(0, 200))
  const customId = custom.body?.data?.id
  check('custom role is not a system role', custom.body?.data?.isSystem === false)

  const bogus = await call('PUT', `/api/app/roles/${customId}/permissions`, {
    ...T(),
    body: { permissions: ['clients.view', 'not.a.real.permission'] },
  })
  check('unknown permission rejected', bogus.status === 400, `got ${bogus.status}`)

  const repermission = await call('PUT', `/api/app/roles/${customId}/permissions`, {
    ...T(),
    body: { permissions: ['clients.view', 'clients.edit', 'payments.view'] },
  })
  check('replace permission set', repermission.status === 200 && repermission.body.data.permissions.length === 3)

  const stripAdmin = await call('PUT', `/api/app/roles/${adminRole.id}/permissions`, {
    ...T(),
    body: { permissions: [] },
  })
  check('Company Admin permissions cannot be stripped', stripAdmin.status === 400, `got ${stripAdmin.status}`)

  const dupRole = await call('POST', '/api/app/roles', { ...T(), body: { name: 'Front Desk', permissions: [] } })
  check('duplicate role name rejected', dupRole.status === 400, `got ${dupRole.status}`)

  console.log('\n== live permission changes ==')
  // Give the dietitian the custom role too, which carries payments.view.
  const grant = await call('PUT', `/api/app/users/${dietitianUserId}/roles`, {
    ...T(),
    body: { roleIds: [dietitianRole.id, customId] },
  })
  check('assign a second role', grant.status === 200 && grant.body.data.roles.length === 2)

  const nowAllowed = await call('GET', '/api/app/clients', D())
  check('permissions are read fresh each request', nowAllowed.status === 200)

  console.log('\n== clients ==')
  const clientRes = await call('POST', '/api/app/clients', {
    ...T(),
    body: {
      firstName: 'Cara',
      lastName: 'Client',
      email: `cara.${stamp()}@test.local`,
      phone: '+1 555 0199',
      dob: '1990-05-14',
      gender: 'FEMALE',
      country: 'United States',
      timezone: 'America/Chicago',
      dietType: 'VEGETARIAN',
      foodAllergies: ['peanuts'],
      mealsPerDay: 4,
      preferredMealTimes: { breakfast: '08:00', lunch: '13:00' },
      heightCm: 165,
      weightKg: 68,
      targetWeightKg: 60,
      callingFrequency: 'WEEKLY',
      preferredCallingDays: [1, 4],
      preferredCallingTime: '09:30',
      callingTimezone: 'Asia/Kolkata',
      callDurationMinutes: 30,
      assignedDietitianId: dietitianUserId,
      callStartDate: new Date().toISOString(),
      numberOfScheduledCalls: 12,
    },
  })
  check('create client', clientRes.status === 201, JSON.stringify(clientRes.body).slice(0, 300))
  const clientId = clientRes.body?.data?.id
  check('bmi derived server-side', clientRes.body?.data?.bmi === 25, `${clientRes.body?.data?.bmi}`)
  check('modern IANA zone accepted', clientRes.body?.data?.callingTimezone === 'Asia/Kolkata')
  check('dietitian assignment resolved', clientRes.body?.data?.assignedDietitian?.id === dietitianUserId)

  const bothWindows = await call('POST', '/api/app/clients', {
    ...T(),
    body: {
      firstName: 'Bad',
      lastName: 'Window',
      callEndDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      numberOfScheduledCalls: 10,
    },
  })
  check('end date + call count rejected', bothWindows.status === 400, `got ${bothWindows.status}`)

  const customNoRule = await call('POST', '/api/app/clients', {
    ...T(),
    body: { firstName: 'No', lastName: 'Rule', callingFrequency: 'CUSTOM' },
  })
  check('CUSTOM frequency without a rule rejected', customNoRule.status === 400, `got ${customNoRule.status}`)

  const customWithRule = await call('POST', '/api/app/clients', {
    ...T(),
    body: {
      firstName: 'Has',
      lastName: 'Rule',
      callingFrequency: 'CUSTOM',
      everyXDays: 10,
      specificDaysOfWeek: [2, 5],
    },
  })
  check('CUSTOM frequency with a rule accepted', customWithRule.status === 201, JSON.stringify(customWithRule.body).slice(0, 200))
  check('custom rule persisted', customWithRule.body?.data?.everyXDays === 10)

  const crossStaff = await call('POST', '/api/app/clients', {
    ...T(),
    body: { firstName: 'Cross', lastName: 'Tenant', assignedDietitianId: b.adminId },
  })
  check("cannot assign another tenant's user as dietitian", crossStaff.status === 400, `got ${crossStaff.status}`)

  const reweigh = await call('PATCH', `/api/app/clients/${clientId}`, { ...T(), body: { weightKg: 62 } })
  check('bmi recomputed on update', reweigh.body?.data?.bmi === 22.8, `${reweigh.body?.data?.bmi}`)

  const deactivate = await call('PATCH', `/api/app/clients/${clientId}/status`, {
    ...T(),
    body: { status: 'INACTIVE' },
  })
  check('deactivate client', deactivate.status === 200 && deactivate.body.data.status === 'INACTIVE')

  console.log('\n== customer enquiries ==')
  const enq = await call('POST', '/api/app/enquiries', {
    ...T(),
    body: {
      firstName: 'Evan',
      lastName: 'Enquirer',
      email: `evan.${stamp()}@test.local`,
      phone: '+1 555 0123',
      source: 'Walk-in',
    },
  })
  check('create enquiry', enq.status === 201, JSON.stringify(enq.body).slice(0, 200))
  const enquiryId = enq.body?.data?.id

  const assigned = await call('PATCH', `/api/app/enquiries/${enquiryId}/assign`, {
    ...T(),
    body: { assignedToId: dietitianUserId },
  })
  check('assign enquiry to staff', assigned.status === 200 && assigned.body.data.assignedToId === dietitianUserId)

  const crossAssign = await call('PATCH', `/api/app/enquiries/${enquiryId}/assign`, {
    ...T(),
    body: { assignedToId: b.adminId },
  })
  check("cannot assign another tenant's user", crossAssign.status === 400, `got ${crossAssign.status}`)

  const cmt = await call('POST', `/api/app/enquiries/${enquiryId}/comments`, {
    ...T(),
    body: { body: 'Called, asked for a callback next week.' },
  })
  check('add comment', cmt.status === 201 && cmt.body.data.author?.id === a.adminId)

  const fu = await call('POST', `/api/app/enquiries/${enquiryId}/followups`, {
    ...T(),
    body: {
      dueAt: new Date(Date.now() + 5 * 86400000).toISOString(),
      timezone: 'Asia/Kolkata',
      remindAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    },
  })
  check('schedule follow-up', fu.status === 201, JSON.stringify(fu.body).slice(0, 200))

  const afterFu = await call('GET', `/api/app/enquiries/${enquiryId}`, T())
  check('follow-up advances status', afterFu.body?.data?.status === 'FOLLOW_UP')
  check('history carries comments and follow-ups', afterFu.body?.data?.comments?.length === 1 && afterFu.body?.data?.followUps?.length === 1)

  const prefill = await call('GET', `/api/app/enquiries/${enquiryId}/convert/prefill`, T())
  check('conversion prefill returns enquiry data', prefill.status === 200 && prefill.body.data.firstName === 'Evan')

  const converted = await call('POST', `/api/app/enquiries/${enquiryId}/convert`, {
    ...T(),
    body: {
      firstName: prefill.body.data.firstName,
      lastName: prefill.body.data.lastName,
      email: prefill.body.data.email,
      phone: prefill.body.data.phone,
      country: 'United States',
      timezone: 'America/Chicago',
      callingFrequency: 'WEEKLY',
    },
  })
  check('convert enquiry to client', converted.status === 201, JSON.stringify(converted.body).slice(0, 300))

  const afterConvert = await call('GET', `/api/app/enquiries/${enquiryId}`, T())
  check('enquiry marked CONVERTED', afterConvert.body?.data?.status === 'CONVERTED')
  check('enquiry linked to the new client', afterConvert.body?.data?.convertedClientId === converted.body.data.id)

  const reconvert = await call('POST', `/api/app/enquiries/${enquiryId}/convert`, {
    ...T(),
    body: { firstName: 'Dup', lastName: 'Licate', country: 'United States' },
  })
  check('double conversion rejected', reconvert.status === 400, `got ${reconvert.status}`)

  console.log('\n== cross-tenant isolation ==')
  const B = (extra = {}) => ({ token: b.token, tenant: b.subdomain, ...extra })

  const bSeesAClient = await call('GET', `/api/app/clients/${clientId}`, B())
  check("company B cannot read company A's client by id", bSeesAClient.status === 404, `got ${bSeesAClient.status}`)

  const bSeesAEnquiry = await call('GET', `/api/app/enquiries/${enquiryId}`, B())
  check("company B cannot read company A's enquiry by id", bSeesAEnquiry.status === 404, `got ${bSeesAEnquiry.status}`)

  const bEditsARole = await call('PATCH', `/api/app/roles/${customId}`, { ...B(), body: { description: 'hijack' } })
  check("company B cannot edit company A's role", bEditsARole.status === 404, `got ${bEditsARole.status}`)

  const bResetsAUser = await call('POST', `/api/app/users/${dietitianUserId}/reset-password`, B())
  check("company B cannot reset company A's user password", bResetsAUser.status === 404, `got ${bResetsAUser.status}`)

  const bList = await call('GET', '/api/app/clients', B())
  check('company B client list is empty', bList.body?.data?.total === 0, `${bList.body?.data?.total}`)

  const tokenSwap = await call('GET', '/api/app/clients', { token: a.token, tenant: b.subdomain })
  check("company A's token on company B's subdomain is refused", tokenSwap.status === 403, `got ${tokenSwap.status}`)

  const platformOnCustomer = await call('GET', '/api/app/clients', { token: platformToken, tenant: a.subdomain })
  check('SUPER_ADMIN token cannot reach customer routes', platformOnCustomer.status === 403, `got ${platformOnCustomer.status}`)

  const customerNoTenant = await call('GET', '/api/app/clients', { token: a.token })
  check('customer routes require a tenant host', customerNoTenant.status === 404, `got ${customerNoTenant.status}`)

  console.log('\n== dashboard ==')
  const dash = await call('GET', '/api/app/dashboard/summary', T())
  check('dashboard returns 200', dash.status === 200)
  const d = dash.body?.data ?? {}
  check('client counts are tenant-scoped', d.totalClients === 3, `${d.totalClients}`)
  check('active/inactive split', d.activeClients === 2 && d.inactiveClients === 1, `${d.activeClients}/${d.inactiveClients}`)
  check('dietitian counted', d.totalDietitians === 1, `${d.totalDietitians}`)
  check(
    'unsourced metrics report 0',
    [d.todaysCalls, d.upcomingCalls, d.autoScheduledCalls, d.pendingCalls, d.missedCalls, d.totalPayments, d.pendingPayments].every(
      (value) => value === 0,
    ),
  )
  check('recent enquiries included', Array.isArray(d.recentEnquiries) && d.recentEnquiries.length >= 1)

  const bDash = await call('GET', '/api/app/dashboard/summary', B())
  check('company B dashboard shows its own zeros', bDash.body?.data?.totalClients === 0)

  console.log('\n== self-deactivation guard ==')
  const selfOff = await call('PATCH', `/api/app/users/${a.adminId}/status`, {
    ...T(),
    body: { status: 'INACTIVE' },
  })
  check('cannot deactivate your own account', selfOff.status === 400, `got ${selfOff.status}`)

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
