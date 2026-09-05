import { axiosClient } from './axiosClient';

export const listRecipesRequest = (params) => axiosClient.get('/recipes', { params }).then((r) => r.data);

export const createRecipeRequest = (payload) => axiosClient.post('/recipes', payload).then((r) => r.data);

export const updateRecipeRequest = (recipeId, payload) =>
  axiosClient.patch(`/recipes/${recipeId}`, payload).then((r) => r.data);

export const deleteRecipeRequest = (recipeId) => axiosClient.delete(`/recipes/${recipeId}`).then((r) => r.data);
