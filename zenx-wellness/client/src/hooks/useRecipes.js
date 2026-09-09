import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRecipeRequest,
  deleteRecipeRequest,
  duplicateRecipeRequest,
  favoriteRecipeRequest,
  getRecipeRequest,
  listRecipesRequest,
  unfavoriteRecipeRequest,
  updateRecipeRequest,
  uploadRecipeImageRequest,
} from '../api/recipes.api';

export function useRecipes(params) {
  return useQuery({ queryKey: ['recipes', params ?? {}], queryFn: () => listRecipesRequest(params) });
}

export function useRecipe(recipeId) {
  return useQuery({
    queryKey: ['recipes', 'detail', recipeId],
    queryFn: () => getRecipeRequest(recipeId),
    enabled: Boolean(recipeId),
  });
}

function invalidateRecipes(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['recipes'] });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecipeRequest,
    onSuccess: () => invalidateRecipes(queryClient),
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, ...payload }) => updateRecipeRequest(recipeId, payload),
    onSuccess: () => invalidateRecipes(queryClient),
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecipeRequest,
    onSuccess: () => invalidateRecipes(queryClient),
  });
}

export function useDuplicateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicateRecipeRequest,
    onSuccess: () => invalidateRecipes(queryClient),
  });
}

export function useToggleRecipeFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, favorited }) =>
      favorited ? unfavoriteRecipeRequest(recipeId) : favoriteRecipeRequest(recipeId),
    onSuccess: () => invalidateRecipes(queryClient),
  });
}

export function useUploadRecipeImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, file }) => uploadRecipeImageRequest(recipeId, file),
    onSuccess: () => invalidateRecipes(queryClient),
  });
}
