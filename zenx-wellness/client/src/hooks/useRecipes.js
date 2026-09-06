import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRecipeRequest, deleteRecipeRequest, listRecipesRequest, updateRecipeRequest } from '../api/recipes.api';

export function useRecipes(params) {
  return useQuery({ queryKey: ['recipes', params ?? {}], queryFn: () => listRecipesRequest(params) });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRecipeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, ...payload }) => updateRecipeRequest(recipeId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRecipeRequest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });
}
