import prisma from '../../config/prisma.js'

/**
 * Company Admin dashboard counters, every one of them scoped to the tenant.
 *
 * Call and payment metrics have no source table until appointments (2D) and
 * payments land, so they report 0 rather than being omitted — the shape of the
 * response stays stable as those modules arrive.
 */
export const getSummary = async (companyId) => {
  const [
    totalClients,
    activeClients,
    inactiveClients,
    totalDietitians,
    totalTrainers,
    recentEnquiries,
  ] = await Promise.all([
    prisma.client.count({ where: { companyId } }),
    prisma.client.count({ where: { companyId, status: 'ACTIVE' } }),
    prisma.client.count({ where: { companyId, status: 'INACTIVE' } }),
    prisma.user.count({ where: { companyId, role: 'DIETITIAN', status: 'ACTIVE' } }),
    prisma.user.count({ where: { companyId, role: 'TRAINER', status: 'ACTIVE' } }),
    prisma.customerEnquiry.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    totalClients,
    activeClients,
    inactiveClients,
    totalDietitians,
    totalTrainers,
    // Populated once the scheduler exists (Phase 2D).
    todaysCalls: 0,
    upcomingCalls: 0,
    autoScheduledCalls: 0,
    pendingCalls: 0,
    missedCalls: 0,
    // Populated once payments exist.
    totalPayments: 0,
    pendingPayments: 0,
    recentEnquiries,
  }
}
