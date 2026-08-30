import {
  listRecipes as queryRecipes,
  findRecipeById,
  createRecipe as createRecipeRecord,
  updateRecipeById,
  deleteRecipeById,
} from '../models/Recipe.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertUserInCompany } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';

export const listRecipes = asyncHandler(async (req, res) => {
  const filter = { companyId: req.user.companyId };
  if (req.query.mealType) filter.mealType = req.query.mealType;
  if (req.query.search) filter.search = req.query.search;
  const recipes = await queryRecipes(filter);
  res.json(recipes.map((r) => toClientShape(r)));
});

export const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await findRecipeById(req.params.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  await assertUserInCompany(req, recipe.createdBy);
  res.json(toClientShape(recipe));
});

export const createRecipe = asyncHandler(async (req, res) => {
  const recipe = await createRecipeRecord({ ...req.body, createdBy: req.user.id });
  res.status(201).json(toClientShape(recipe));
});

export const updateRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertUserInCompany(req, existing.createdBy);
  const recipe = await updateRecipeById(req.params.id, req.body);
  res.json(toClientShape(recipe));
});

export const deleteRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertUserInCompany(req, existing.createdBy);
  await deleteRecipeById(req.params.id);
  res.status(204).send();
});
