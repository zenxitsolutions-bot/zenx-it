import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'
import { isValidSubdomain, RESERVED_SUBDOMAINS } from '../../utils/subdomain.js'

export const listDomains = async (companyId) =>
  prisma.companyDomain.findMany({
    where: { companyId },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  })

const assertAvailable = async (subdomain) => {
  if (!isValidSubdomain(subdomain) || RESERVED_SUBDOMAINS.has(subdomain)) {
    throw badRequest('That subdomain is not available', { subdomain: 'Not available' })
  }

  const taken = await prisma.companyDomain.findUnique({ where: { subdomain } })
  if (taken) {
    throw badRequest('That subdomain is already in use', { subdomain: 'Already in use' })
  }
}

export const addDomain = async (companyId, { subdomain, isPrimary = false }) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new ApiError(404, 'Company not found')

  await assertAvailable(subdomain)

  return prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.companyDomain.updateMany({ where: { companyId }, data: { isPrimary: false } })
    }
    return tx.companyDomain.create({ data: { companyId, subdomain, isPrimary } })
  })
}

export const updateDomain = async (companyId, domainId, data) => {
  const domain = await prisma.companyDomain.findFirst({ where: { id: domainId, companyId } })
  if (!domain) throw new ApiError(404, 'Domain not found')

  // A company must keep one reachable primary domain.
  if (data.isActive === false && domain.isPrimary) {
    throw badRequest('Cannot deactivate the primary domain — promote another one first')
  }

  return prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.companyDomain.updateMany({ where: { companyId }, data: { isPrimary: false } })
    }
    return tx.companyDomain.update({ where: { id: domainId }, data })
  })
}
