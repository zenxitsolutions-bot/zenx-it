import {
  listRecipes as queryRecipes,
  findRecipeById,
  createRecipe as createRecipeRecord,
  updateRecipeById,
  deleteRecipeById,
  duplicateRecipe as duplicateRecipeRecord,
  setRecipeFavorite,
} from '../models/Recipe.js';
import { findUserById } from '../models/User.js';
import { recommendRecipes } from '../services/recipeRecommend.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertCanMutateRecipe, assertCanViewRecipe } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';
import { uploadsDir } from '../middleware/upload.js';
import path from 'node:path';
import fs from 'node:fs';

function shape(recipe) {
  return toClientShape(recipe);
}

export const listRecipes = asyncHandler(async (req, res) => {
  const filter = {
    companyId: req.user.companyId,
    userId: req.user.id,
  };
  if (req.query.mealType) filter.mealType = req.query.mealType;
  if (req.query.search) filter.search = req.query.search;
  if (req.query.dietType) filter.dietType = req.query.dietType;
  if (req.query.tag) filter.tag = req.query.tag;
  if (req.query.maxKcal) filter.maxKcal = req.query.maxKcal;
  if (req.query.minProtein) filter.minProtein = req.query.minProtein;
  if (req.query.favorite === '1' || req.query.favorite === 'true') filter.favorite = true;
  const recipes = await queryRecipes(filter);
  res.json(recipes.map(shape));
});

export const listRecommendedRecipes = asyncHandler(async (req, res) => {
  const clientId = req.query.clientId;
  if (!clientId) throw ApiError.badRequest('clientId is required');
  const client = await findUserById(clientId);
  if (!client || client.companyId !== req.user.companyId) throw ApiError.notFound('Client not found');
  const recipes = await queryRecipes({ companyId: req.user.companyId, userId: req.user.id });
  const recommended = recommendRecipes(recipes, {
    dietPreference: client.dietPreference,
    allergies: client.allergies,
    programName: client.programPlan?.name,
  });
  res.json(recommended.map(shape));
});

export const getRecipe = asyncHandler(async (req, res) => {
  const recipe = await findRecipeById(req.params.id, req.user.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  await assertCanViewRecipe(req, recipe);
  res.json(shape(recipe));
});

export const createRecipe = asyncHandler(async (req, res) => {
  const recipe = await createRecipeRecord({ ...req.body, createdBy: req.user.id, visibility: 'company' });
  res.status(201).json(shape(recipe));
});

export const updateRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertCanMutateRecipe(req, existing);
  const { visibility: _visibility, ...patch } = req.body;
  const recipe = await updateRecipeById(req.params.id, patch);
  res.json(shape(await findRecipeById(recipe.id, req.user.id)));
});

export const deleteRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertCanMutateRecipe(req, existing);
  await deleteRecipeById(req.params.id);
  res.status(204).send();
});

export const duplicateRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertCanViewRecipe(req, existing);
  const copy = await duplicateRecipeRecord(req.params.id, req.user.id);
  res.status(201).json(shape(copy));
});

export const favoriteRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertCanViewRecipe(req, existing);
  const recipe = await setRecipeFavorite(req.user.id, req.params.id, true);
  res.json(shape(recipe));
});

export const unfavoriteRecipe = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertCanViewRecipe(req, existing);
  const recipe = await setRecipeFavorite(req.user.id, req.params.id, false);
  res.json(shape(recipe));
});

export const uploadRecipeImage = asyncHandler(async (req, res) => {
  const existing = await findRecipeById(req.params.id);
  if (!existing) throw ApiError.notFound('Recipe not found');
  await assertCanMutateRecipe(req, existing);
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const recipe = await updateRecipeById(req.params.id, { imageUrl: req.file.filename });
  res.json(shape(await findRecipeById(recipe.id, req.user.id)));
});

export const getRecipeImage = asyncHandler(async (req, res) => {
  const recipe = await findRecipeById(req.params.id);
  if (!recipe) throw ApiError.notFound('Recipe not found');
  await assertCanViewRecipe(req, recipe);
  if (!recipe.imageUrl) throw ApiError.notFound('No image uploaded');
  if (/^https?:\/\//i.test(recipe.imageUrl)) {
    res.redirect(recipe.imageUrl);
    return;
  }
  const absolutePath = path.join(uploadsDir, path.basename(recipe.imageUrl));
  if (!fs.existsSync(absolutePath)) throw ApiError.notFound('No image uploaded');
  res.sendFile(absolutePath);
});
