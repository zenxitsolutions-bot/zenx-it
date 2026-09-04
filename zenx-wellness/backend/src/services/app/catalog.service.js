import prisma from '../../config/prisma.js'
import { ApiError, badRequest } from '../../utils/ApiError.js'

/**
 * Recipes and exercises are both flat, tenant-scoped, soft-deactivatable
 * catalogs, so they share one implementation.
 */
export const CATALOGS = {
  RECIPE: { model: 'recipe', label: 'Recipe', searchFields: ['name', 'description'] },
  EXERCISE: { model: 'exercise', label: 'Exercise', searchFields: ['name', 'description', 'targetMuscleGroup'] },
}

const creator = { select: { id: true, firstName: true, lastName: true } }

const findScoped = async (catalog, companyId, id) => {
  const row = await prisma[catalog.model].findFirst({
    where: { id, companyId },
    include: { createdBy: creator },
  })
  if (!row) throw new ApiError(404, `${catalog.label} not found`)
  return row
}

export const listItems = async (catalog, companyId, { page = 1, pageSize = 20, search, isActive, ...filters } = {}) => {
  const where = {
    companyId,
    ...(isActive === undefined ? {} : { isActive }),
    ...filters,
    ...(search
      ? { OR: catalog.searchFields.map((field) => ({ [field]: { contains: search } })) }
      : {}),
  }

  const [items, total] = await Promise.all([
    prisma[catalog.model].findMany({
      where,
      include: { createdBy: creator },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma[catalog.model].count({ where }),
  ])

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export const getItem = async (catalog, companyId, id) => findScoped(catalog, companyId, id)

export const createItem = async (catalog, companyId, createdById, data) => {
  const clash = await prisma[catalog.model].findFirst({ where: { companyId, name: data.name } })
  if (clash) {
    throw badRequest(`A ${catalog.label.toLowerCase()} with that name already exists`, { name: 'Already in use' })
  }

  return prisma[catalog.model].create({
    data: { ...data, companyId, createdById },
    include: { createdBy: creator },
  })
}

export const updateItem = async (catalog, companyId, id, data) => {
  await findScoped(catalog, companyId, id)

  if (data.name) {
    const clash = await prisma[catalog.model].findFirst({
      where: { companyId, name: data.name, id: { not: id } },
    })
    if (clash) {
      throw badRequest(`A ${catalog.label.toLowerCase()} with that name already exists`, { name: 'Already in use' })
    }
  }

  return prisma[catalog.model].update({ where: { id }, data, include: { createdBy: creator } })
}

/** Deactivated rather than deleted — existing plan items still reference them. */
export const setItemActive = async (catalog, companyId, id, isActive) => {
  await findScoped(catalog, companyId, id)
  return prisma[catalog.model].update({ where: { id }, data: { isActive }, include: { createdBy: creator } })
}
