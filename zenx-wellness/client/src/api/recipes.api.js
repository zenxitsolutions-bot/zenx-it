import { axiosClient } from './axiosClient';

export const listRecipesRequest = (params) => axiosClient.get('/recipes', { params }).then((r) => r.data);

export const listRecommendedRecipesRequest = (clientId) =>
  axiosClient.get('/recipes/recommended', { params: { clientId } }).then((r) => r.data);

export const getRecipeRequest = (recipeId) => axiosClient.get(`/recipes/${recipeId}`).then((r) => r.data);

export const createRecipeRequest = (payload) => axiosClient.post('/recipes', payload).then((r) => r.data);

export const updateRecipeRequest = (recipeId, payload) =>
  axiosClient.patch(`/recipes/${recipeId}`, payload).then((r) => r.data);

export const deleteRecipeRequest = (recipeId) => axiosClient.delete(`/recipes/${recipeId}`).then((r) => r.data);

export const duplicateRecipeRequest = (recipeId) => axiosClient.post(`/recipes/${recipeId}/duplicate`).then((r) => r.data);

export const favoriteRecipeRequest = (recipeId) => axiosClient.post(`/recipes/${recipeId}/favorite`).then((r) => r.data);

export const unfavoriteRecipeRequest = (recipeId) => axiosClient.delete(`/recipes/${recipeId}/favorite`).then((r) => r.data);

export const uploadRecipeImageRequest = (recipeId, file) => {
  const form = new FormData();
  form.append('image', file);
  return axiosClient.post(`/recipes/${recipeId}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};
