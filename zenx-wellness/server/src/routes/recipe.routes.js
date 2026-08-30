import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  listRecipes,
  getRecipe,
  createRecipe,
  updateRecipe,
  deleteRecipe,
} from '../controllers/recipe.controller.js';
import { createRecipeSchema, updateRecipeSchema } from '../schemas/recipe.schema.js';

export const recipeRouter = Router();
recipeRouter.use(authenticate, blockIfMustChangePassword, authorize('dietitian', 'admin'));

recipeRouter.get('/', listRecipes);
recipeRouter.get('/:id', getRecipe);
recipeRouter.post('/', validate(createRecipeSchema), createRecipe);
recipeRouter.patch('/:id', validate(updateRecipeSchema), updateRecipe);
recipeRouter.delete('/:id', deleteRecipe);
