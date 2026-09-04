import bcrypt from 'bcryptjs'
import prisma from '../src/config/prisma.js'
import { PERMISSIONS } from '../src/constants/permissions.js'
import { seedCompanyRoles } from '../src/services/app/rbac.service.js'

const requiredEnv = (key) => {
  const value = process.env[key]
  if (!value || !value.trim()) {
    console.error(`Missing required environment variable: ${key}`)
    process.exit(1)
  }
  return value.trim()
}

const DEFAULT_PLANS = [
  {
    name: 'Starter',
    description: 'For a single practitioner getting started.',
    features: { maxClients: 100, maxStaff: 3, dietPlans: true, workoutPlans: false, payments: false },
  },
  {
    name: 'Growth',
    description: 'For growing clinics running diet and training together.',
    features: { maxClients: 1000, maxStaff: 15, dietPlans: true, workoutPlans: true, payments: true },
  },
  {
    name: 'Enterprise',
    description: 'For multi-location organisations.',
    features: { maxClients: null, maxStaff: null, dietPlans: true, workoutPlans: true, payments: true },
  },
]

const seedSuperAdmin = async () => {
  const email = requiredEnv('SEED_ADMIN_EMAIL').toLowerCase()
  const password = requiredEnv('SEED_ADMIN_PASSWORD')
  const firstName = requiredEnv('SEED_ADMIN_FIRST_NAME')
  const lastName = requiredEnv('SEED_ADMIN_LAST_NAME')

  // Platform admins carry companyId = null, and MySQL does not enforce the
  // (companyId, email) unique constraint across NULLs — so check explicitly.
  let user = await prisma.user.findFirst({ where: { email, companyId: null } })

  if (user) {
    console.log(`Super admin already exists (${email}).`)
  } else {
    user = await prisma.user.create({
      data: {
        companyId: null,
        firstName,
        lastName,
        email,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
      },
    })
    console.log(`Created SUPER_ADMIN: ${user.email} (${user.id})`)
  }

  const platformAdmin = await prisma.platformAdmin.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, designation: 'Platform Owner' },
  })
  console.log(`Platform admin record ready (${platformAdmin.id})`)
}

const seedPlans = async () => {
  for (const plan of DEFAULT_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { name: plan.name } })
    if (existing) {
      console.log(`Plan "${plan.name}" already exists.`)
      continue
    }
    await prisma.subscriptionPlan.create({ data: plan })
    console.log(`Created plan "${plan.name}"`)
  }
}

/** The permission catalog is global and shared by every tenant. */
const seedPermissions = async () => {
  let created = 0
  for (const permission of PERMISSIONS) {
    const result = await prisma.permission.upsert({
      where: { key: permission.key },
      update: { category: permission.category, action: permission.action, label: permission.label },
      create: permission,
    })
    if (result) created += 1
  }
  console.log(`Permission catalog synced (${created} entries)`)
}

/** Gives companies created before the RBAC module their default role set. */
const backfillCompanyRoles = async () => {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } })

  for (const company of companies) {
    const hadRoles = (await prisma.role.count({ where: { companyId: company.id } })) > 0

    // Idempotent: creates anything missing and re-syncs the admin role against
    // the current catalog, so new permissions reach existing tenants.
    const roles = await seedCompanyRoles(company.id)

    if (hadRoles) continue
    const admins = await prisma.user.findMany({
      where: { companyId: company.id, role: 'COMPANY_ADMIN' },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: admin.id, roleId: roles['Company Admin'].id } },
        update: {},
        create: { userId: admin.id, roleId: roles['Company Admin'].id },
      })
    }

    console.log(`Backfilled roles for "${company.name}"`)
  }
}

const main = async () => {
  await seedSuperAdmin()
  await seedPlans()
  await seedPermissions()
  await backfillCompanyRoles()
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
