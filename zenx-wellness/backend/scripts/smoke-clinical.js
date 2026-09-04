/**
 * End-to-end exercise of the Phase 2C surface: dietitians, trainers,
 * availability (including the DST-correct free/busy probe), recipes, diet
 * plans, exercises and workout plans.
 */
import app from '../src/app.js'
import prisma from '../src/config/prisma.js'
import { zonedParts } from '../src/utils/timezone.js'

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
  return { subdomain, token: login.body?.data?.token, adminId: admin.id }
}

const run = async () => {
  const platformLogin = await call('POST', '/api/auth/login', {
    body: { email: 'admin@zenx.com', password: 'Admin@12345' },
  })
  const platformToken = platformLogin.body?.data?.token
  const plans = await call('GET', '/api/platform/plans', { token: platformToken })
  const planId = plans.body.data[0].id

  const a = await provision(platformToken, planId, `Clinic A ${stamp()}`)
  const b = await provision(platformToken, planId, `Clinic B ${stamp()}`)
  const T = (extra = {}) => ({ token: a.token, tenant: a.subdomain, ...extra })
  const B = (extra = {}) => ({ token: b.token, tenant: b.subdomain, ...extra })

  console.log('\n== dietitians & trainers ==')
  const dId = stamp()
  const dietitian = await call('POST', '/api/app/dietitians', {
    ...T(),
    body: {
      firstName: 'Dina',
      lastName: 'Diet',
      email: `dina.${dId}@test.local`,
      username: `dina_${dId}`,
      phone: '+1 555 0101',
      timezone: 'America/Chicago',
      specialization: 'Sports nutrition',
      address: '1 Main St',
    },
  })
  check('create dietitian', dietitian.status === 201, JSON.stringify(dietitian.body).slice(0, 250))
  const dietitianUserId = dietitian.body?.data?.staff?.userId
  const dietitianId = dietitian.body?.data?.staff?.id
  const dietitianPassword = dietitian.body?.data?.temporaryPassword
  check('profile flattens user identity', dietitian.body?.data?.staff?.firstName === 'Dina')
  check('specialization stored', dietitian.body?.data?.staff?.specialization === 'Sports nutrition')

  const tId = stamp()
  const trainer = await call('POST', '/api/app/trainers', {
    ...T(),
    body: {
      firstName: 'Tom',
      lastName: 'Train',
      email: `tom.${tId}@test.local`,
      username: `tom_${tId}`,
      timezone: 'Asia/Kolkata',
      specialization: 'Strength',
    },
  })
  check('create trainer', trainer.status === 201, JSON.stringify(trainer.body).slice(0, 250))
  const trainerUserId = trainer.body?.data?.staff?.userId

  const dietLogin = await call('POST', '/api/auth/login', {
    tenant: a.subdomain,
    body: { email: dietitian.body.data.staff.email, password: dietitianPassword },
  })
  const dietToken = dietLogin.body?.data?.token
  check('dietitian can sign in with the Dietitian role', dietLogin.status === 200)
  const D = (extra = {}) => ({ token: dietToken, tenant: a.subdomain, ...extra })

  const deact = await call('PATCH', `/api/app/dietitians/${dietitianId}/status`, {
    ...T(),
    body: { status: 'INACTIVE' },
  })
  check('deactivate dietitian', deact.status === 200 && deact.body.data.status === 'INACTIVE')

  const loginWhileOff = await call('POST', '/api/auth/login', {
    tenant: a.subdomain,
    body: { email: dietitian.body.data.staff.email, password: dietitianPassword },
  })
  check('deactivation revokes the login too', loginWhileOff.status === 403, `got ${loginWhileOff.status}`)

  await call('PATCH', `/api/app/dietitians/${dietitianId}/status`, { ...T(), body: { status: 'ACTIVE' } })

  console.log('\n== availability ==')
  const setAvail = await call('PUT', `/api/app/availability/${dietitianUserId}`, {
    ...T(),
    body: {
      timezone: 'America/Chicago',
      windows: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
        { dayOfWeek: 2, startTime: '10:00', endTime: '17:00' },
      ],
    },
  })
  check('set weekly availability', setAvail.status === 200 && setAvail.body.data.length === 3)
  check('multiple windows on one day', setAvail.body.data.filter((w) => w.dayOfWeek === 1).length === 2)

  const overlap = await call('PUT', `/api/app/availability/${dietitianUserId}`, {
    ...T(),
    body: {
      timezone: 'America/Chicago',
      windows: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '11:00', endTime: '15:00' },
      ],
    },
  })
  check('overlapping windows rejected', overlap.status === 400, `got ${overlap.status}`)

  const backwards = await call('PUT', `/api/app/availability/${dietitianUserId}`, {
    ...T(),
    body: { timezone: 'America/Chicago', windows: [{ dayOfWeek: 3, startTime: '15:00', endTime: '09:00' }] },
  })
  check('end-before-start rejected', backwards.status === 400, `got ${backwards.status}`)

  // 2026-03-09 is the Monday after US DST starts; 2026-03-02 is the Monday before.
  const beforeDst = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-02T16:00:00Z')}&durationMinutes=30`,
    T(),
  )
  check('10:00 CT before DST is inside 09:00-12:00', beforeDst.body?.data?.available === true, JSON.stringify(beforeDst.body))

  const afterDst = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-09T15:00:00Z')}&durationMinutes=30`,
    T(),
  )
  check('10:00 CT after DST is still inside the window', afterDst.body?.data?.available === true, JSON.stringify(afterDst.body))

  const naiveAfterDst = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-09T13:30:00Z')}&durationMinutes=30`,
    T(),
  )
  check(
    'a fixed-offset assumption would wrongly allow 08:30 CT — rejected',
    naiveAfterDst.body?.data?.available === false && naiveAfterDst.body?.data?.reason === 'OUTSIDE_WORKING_HOURS',
    JSON.stringify(naiveAfterDst.body),
  )

  const wrongDay = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-11T15:00:00Z')}&durationMinutes=30`,
    T(),
  )
  check('Wednesday has no windows', wrongDay.body?.data?.available === false)

  const spill = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-09T17:30:00Z')}&durationMinutes=60`,
    T(),
  )
  check('a slot spilling past 12:00 is refused', spill.body?.data?.available === false, JSON.stringify(spill.body))

  const block = await call('POST', `/api/app/availability/${dietitianUserId}/blocks`, {
    ...T(),
    body: {
      startDate: '2026-03-09',
      endDate: '2026-03-13',
      isFullDay: true,
      timezone: 'America/Chicago',
      reason: 'Vacation',
    },
  })
  check('create blocked date range', block.status === 201)
  const blockId = block.body?.data?.id

  const duringBlock = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-09T15:00:00Z')}&durationMinutes=30`,
    T(),
  )
  check('blocked date makes the slot unavailable', duringBlock.body?.data?.reason === 'BLOCKED', JSON.stringify(duringBlock.body))

  await call('DELETE', `/api/app/availability/${dietitianUserId}/blocks/${blockId}`, T())
  const afterUnblock = await call(
    'GET',
    `/api/app/availability/${dietitianUserId}/check?at=${encodeURIComponent('2026-03-09T15:00:00Z')}&durationMinutes=30`,
    T(),
  )
  check('removing the block restores the slot', afterUnblock.body?.data?.available === true)

  const slots = await call('GET', `/api/app/availability/${dietitianUserId}/slots?date=2026-03-09&durationMinutes=60`, T())
  check('slots generated for a Monday', slots.status === 200 && slots.body.data.length === 7, `${slots.body?.data?.length}`)
  check(
    'every slot maps back to the right local time',
    slots.body.data.every((slot) => zonedParts(new Date(slot.startsAt), 'America/Chicago').time === slot.localTime),
  )

  console.log('\n== recipes ==')
  const recipe = await call('POST', '/api/app/recipes', {
    ...T(),
    body: {
      name: `Oats Bowl ${stamp()}`,
      mealType: 'BREAKFAST',
      ingredients: [{ name: 'Oats', quantity: 60, unit: 'g' }],
      calories: 350,
      protein: 12,
      prepTimeMinutes: 10,
    },
  })
  check('create recipe', recipe.status === 201, JSON.stringify(recipe.body).slice(0, 200))
  const recipeId = recipe.body?.data?.id

  const dupRecipe = await call('POST', '/api/app/recipes', {
    ...T(),
    body: { name: recipe.body.data.name, mealType: 'LUNCH' },
  })
  check('duplicate recipe name rejected', dupRecipe.status === 400, `got ${dupRecipe.status}`)

  console.log('\n== exercises ==')
  const exercise = await call('POST', '/api/app/exercises', {
    ...T(),
    body: {
      name: `Goblet Squat ${stamp()}`,
      targetMuscleGroup: 'Legs',
      difficulty: 'INTERMEDIATE',
      equipment: 'Kettlebell',
      defaultSets: 3,
      defaultRepetitions: 12,
      restTimeSeconds: 60,
    },
  })
  check('create exercise', exercise.status === 201, JSON.stringify(exercise.body).slice(0, 200))
  const exerciseId = exercise.body?.data?.id

  console.log('\n== clients & caseload ==')
  const mkClient = async (first) => {
    const res = await call('POST', '/api/app/clients', {
      ...T(),
      body: { firstName: first, lastName: 'Client', country: 'United States', timezone: 'America/Chicago' },
    })
    return res.body?.data?.id
  }
  const client1 = await mkClient('Mine')
  const client2 = await mkClient('Theirs')

  const assign = await call('PUT', `/api/app/clients/${client1}/dietitians`, {
    ...T(),
    body: { staffUserIds: [dietitianUserId] },
  })
  check('assign dietitian to client', assign.status === 200 && assign.body.data.length === 1)
  check('first assignment marked primary', assign.body.data[0].isPrimary === true)

  const mirrored = await call('GET', `/api/app/clients/${client1}`, T())
  check('scalar assignedDietitianId mirrors the join row', mirrored.body?.data?.assignedDietitianId === dietitianUserId)

  const crossAssign = await call('PUT', `/api/app/clients/${client1}/trainers`, {
    ...T(),
    body: { staffUserIds: [dietitianUserId] },
  })
  check('a dietitian cannot be assigned as a trainer', crossAssign.status === 400, `got ${crossAssign.status}`)

  await call('PUT', `/api/app/clients/${client1}/trainers`, { ...T(), body: { staffUserIds: [trainerUserId] } })

  const dietSeesOwn = await call('GET', '/api/app/clients', D())
  check('dietitian sees only their caseload', dietSeesOwn.body?.data?.total === 1, `${dietSeesOwn.body?.data?.total}`)

  const dietReadsOther = await call('GET', `/api/app/clients/${client2}`, D())
  check('dietitian cannot read a client outside their caseload', dietReadsOther.status === 404, `got ${dietReadsOther.status}`)

  const adminSeesAll = await call('GET', '/api/app/clients', T())
  check('company admin sees every client', adminSeesAll.body?.data?.total === 2, `${adminSeesAll.body?.data?.total}`)

  const staffClients = await call('GET', `/api/app/dietitians/${dietitianId}/clients`, T())
  check('assigned-clients endpoint', staffClients.status === 200 && staffClients.body.data.total === 1)

  console.log('\n== diet plans ==')
  const plan = await call('POST', '/api/app/diet-plans', {
    ...T(),
    body: {
      name: `Week 1 ${stamp()}`,
      items: [
        { dayOfWeek: 1, mealType: 'BREAKFAST', recipeId },
        { dayOfWeek: 1, mealType: 'LUNCH', customTitle: 'Grilled chicken salad', customInstructions: 'Light dressing' },
        { dayOfWeek: 2, mealType: 'BREAKFAST', recipeId },
      ],
    },
  })
  check('create weekly diet plan', plan.status === 201, JSON.stringify(plan.body).slice(0, 250))
  const planId2 = plan.body?.data?.id
  check('plan holds three items', plan.body?.data?.items?.length === 3)

  const bothSources = await call('POST', '/api/app/diet-plans', {
    ...T(),
    body: { name: `Bad ${stamp()}`, items: [{ dayOfWeek: 1, mealType: 'LUNCH', recipeId, customTitle: 'Also this' }] },
  })
  check('recipe + custom on one item rejected', bothSources.status === 400, `got ${bothSources.status}`)

  const neither = await call('POST', '/api/app/diet-plans', {
    ...T(),
    body: { name: `Bad2 ${stamp()}`, items: [{ dayOfWeek: 1, mealType: 'LUNCH' }] },
  })
  check('item with neither source rejected', neither.status === 400, `got ${neither.status}`)

  const foreignRecipe = await call('POST', '/api/app/diet-plans', {
    ...B(),
    body: { name: `Cross ${stamp()}`, items: [{ dayOfWeek: 1, mealType: 'LUNCH', recipeId }] },
  })
  check("cannot reference another tenant's recipe", foreignRecipe.status === 400, `got ${foreignRecipe.status}`)

  const setDay = await call('PUT', `/api/app/diet-plans/${planId2}/days/1`, {
    ...T(),
    body: { items: [{ mealType: 'DINNER', customTitle: 'Soup', sortOrder: 0 }] },
  })
  check('replace one day only', setDay.status === 200)
  check('day 1 now has one item', setDay.body.data.items.filter((i) => i.dayOfWeek === 1).length === 1)
  check('day 2 untouched', setDay.body.data.items.filter((i) => i.dayOfWeek === 2).length === 1)

  const copied = await call('POST', `/api/app/diet-plans/${planId2}/copy`, { ...T(), body: { name: `Week 2 ${stamp()}` } })
  check('copy a plan', copied.status === 201 && copied.body.data.items.length === 2)

  const assignPlan = await call('PUT', `/api/app/diet-plans/${planId2}/assignments`, {
    ...T(),
    body: { clientIds: [client1, client2] },
  })
  check('assign plan to multiple clients', assignPlan.status === 200 && assignPlan.body.data.assignments.length === 2)

  const foreignClient = await call('PUT', `/api/app/diet-plans/${planId2}/assignments`, {
    ...B(),
    body: { clientIds: [client1] },
  })
  check("cannot assign another tenant's plan", foreignClient.status === 404, `got ${foreignClient.status}`)

  console.log('\n== workout plans ==')
  const weekly = await call('POST', '/api/app/workout-plans', {
    ...T(),
    body: {
      name: `Strength ${stamp()}`,
      planType: 'WEEKLY',
      items: [{ dayOfWeek: 1, exerciseId, sets: 4, repetitions: 10, restTimeSeconds: 90 }],
    },
  })
  check('create weekly workout plan', weekly.status === 201, JSON.stringify(weekly.body).slice(0, 250))
  const weeklyId = weekly.body?.data?.id

  const daily = await call('POST', '/api/app/workout-plans', {
    ...T(),
    body: { name: `Daily ${stamp()}`, planType: 'DAILY', items: [{ exerciseId, sets: 3, repetitions: 15 }] },
  })
  check('create daily workout plan', daily.status === 201, JSON.stringify(daily.body).slice(0, 250))

  const weeklyNoDay = await call('POST', '/api/app/workout-plans', {
    ...T(),
    body: { name: `Bad ${stamp()}`, planType: 'WEEKLY', items: [{ exerciseId, sets: 3 }] },
  })
  check('weekly item without a day rejected', weeklyNoDay.status === 400, `got ${weeklyNoDay.status}`)

  const dailyWithDay = await call('POST', '/api/app/workout-plans', {
    ...T(),
    body: { name: `Bad2 ${stamp()}`, planType: 'DAILY', items: [{ dayOfWeek: 3, exerciseId }] },
  })
  check('daily item with a day rejected', dailyWithDay.status === 400, `got ${dailyWithDay.status}`)

  await call('PUT', `/api/app/workout-plans/${weeklyId}/assignments`, { ...T(), body: { clientIds: [client1] } })

  console.log('\n== client plan visibility ==')
  const clientDiet = await call('GET', `/api/app/clients/${client1}/diet-plans`, T())
  check('client diet plans listed', clientDiet.status === 200 && clientDiet.body.data.length === 1)

  const clientWorkout = await call('GET', `/api/app/clients/${client1}/workout-plans`, T())
  check('client workout plans listed', clientWorkout.status === 200 && clientWorkout.body.data.length === 1)

  const unassignedClient = await call('GET', `/api/app/clients/${client2}/workout-plans`, T())
  check('unassigned client has no workout plans', unassignedClient.body?.data?.length === 0)

  console.log('\n== cross-tenant isolation ==')
  const bReadsRecipe = await call('GET', `/api/app/recipes/${recipeId}`, B())
  check("company B cannot read company A's recipe", bReadsRecipe.status === 404, `got ${bReadsRecipe.status}`)

  const bReadsExercise = await call('GET', `/api/app/exercises/${exerciseId}`, B())
  check("company B cannot read company A's exercise", bReadsExercise.status === 404, `got ${bReadsExercise.status}`)

  const bReadsPlan = await call('GET', `/api/app/diet-plans/${planId2}`, B())
  check("company B cannot read company A's diet plan", bReadsPlan.status === 404, `got ${bReadsPlan.status}`)

  const bReadsAvailability = await call('GET', `/api/app/availability/${dietitianUserId}`, B())
  check("company B cannot read company A's availability", bReadsAvailability.status === 404, `got ${bReadsAvailability.status}`)

  const bReadsDietitian = await call('GET', `/api/app/dietitians/${dietitianId}`, B())
  check("company B cannot read company A's dietitian", bReadsDietitian.status === 404, `got ${bReadsDietitian.status}`)

  const bList = await call('GET', '/api/app/recipes', B())
  check("company B's recipe list is empty", bList.body?.data?.total === 0, `${bList.body?.data?.total}`)

  console.log('\n== permission gating ==')
  const dietMakesExercise = await call('POST', '/api/app/exercises', {
    ...D(),
    body: { name: `Nope ${stamp()}` },
  })
  check('dietitian cannot create exercises', dietMakesExercise.status === 403, `got ${dietMakesExercise.status}`)

  const dietMakesRecipe = await call('POST', '/api/app/recipes', {
    ...D(),
    body: { name: `Yes ${stamp()}`, mealType: 'SNACK' },
  })
  check('dietitian can create recipes', dietMakesRecipe.status === 201, `got ${dietMakesRecipe.status}`)

  const dietMakesDietitian = await call('POST', '/api/app/dietitians', {
    ...D(),
    body: { firstName: 'X', lastName: 'Y', email: `x.${stamp()}@test.local` },
  })
  check('dietitian cannot create dietitians', dietMakesDietitian.status === 403, `got ${dietMakesDietitian.status}`)

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
