import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateRecipe, useUpdateRecipe, useDeleteRecipe } from '@/hooks/useRecipes';
import { RECIPE_CATEGORIES, FIXED_RECIPE_CATEGORIES } from '@/lib/recipeCategories';

const schema = z
  .object({
    title: z.string().min(1, 'Enter a name'),
    emoji: z.string().max(4).optional(),
    category: z.enum(RECIPE_CATEGORIES),
    customCategory: z.string().optional(),
    prepTime: z.string().min(1, 'e.g. 15 min'),
    tags: z.string().optional(),
    kcal: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
    protein: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
    ingredients: z.string().min(1, 'List what clients need'),
    instructions: z.string().min(1, 'Keep the steps clear'),
  })
  .refine((values) => values.category !== 'Custom' || values.customCategory?.trim(), {
    message: 'Enter a category name',
    path: ['customCategory'],
  });

const EMPTY = {
  title: '',
  emoji: '🍽️',
  category: 'Breakfast',
  customCategory: '',
  prepTime: '',
  tags: '',
  kcal: '',
  protein: '',
  ingredients: '',
  instructions: '',
};

function toFormValues(recipe) {
  if (!recipe) return EMPTY;
  const isCustom = !FIXED_RECIPE_CATEGORIES.includes(recipe.mealType);
  return {
    title: recipe.title,
    emoji: recipe.emoji ?? '🍽️',
    category: isCustom ? 'Custom' : recipe.mealType,
    customCategory: isCustom ? recipe.mealType : '',
    prepTime: recipe.prepTime,
    tags: (recipe.tags ?? []).join(', '),
    kcal: recipe.kcal ?? '',
    protein: recipe.protein ?? '',
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

// recipe: null (create) | a recipe object (edit)
export function RecipeFormDialog({ open, onOpenChange, recipe }) {
  const isEdit = Boolean(recipe);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const isSaving = createRecipe.isPending || updateRecipe.isPending;

  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(recipe) });
  const category = form.watch('category');

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(recipe));
      setConfirmingDelete(false);
    }
  }, [open, recipe, form]);

  function onSubmit(values) {
    const payload = {
      title: values.title,
      emoji: values.emoji || '🍽️',
      mealType: values.category === 'Custom' ? values.customCategory.trim() : values.category,
      prepTime: values.prepTime,
      tags: values.tags
        ? values.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [],
      kcal: values.kcal === '' ? undefined : values.kcal,
      protein: values.protein === '' ? undefined : values.protein,
      ingredients: values.ingredients,
      instructions: values.instructions,
    };

    const mutation = isEdit ? updateRecipe : createRecipe;
    const mutateArgs = isEdit ? { recipeId: recipe._id, ...payload } : payload;

    mutation.mutate(mutateArgs, {
      onSuccess: () => {
        toast.success(isEdit ? 'Recipe updated.' : 'Recipe created.');
        onOpenChange(false);
      },
      onError: () => toast.error("We couldn't save that — please try again."),
    });
  }

  function handleDelete() {
    deleteRecipe.mutate(recipe._id, {
      onSuccess: () => {
        toast.success('Recipe deleted.');
        onOpenChange(false);
      },
      onError: () => toast.error("We couldn't delete that — please try again."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit recipe' : 'Create a recipe'}</DialogTitle>
          <DialogDescription>This will be available to every dietitian and admin.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <div className="grid grid-cols-[64px_1fr] gap-3">
              <FormField
                control={form.control}
                name="emoji"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input {...field} className="text-center text-lg" maxLength={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recipe name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Spinach & feta omelette" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RECIPE_CATEGORIES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prepTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prep time</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 15 min" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {category === 'Custom' && (
              <FormField
                control={form.control}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom category</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Coffee, Pre-Workout" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input placeholder="High protein, Vegetarian" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="kcal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calories (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="protein"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protein g (optional)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ingredients"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingredients</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="List the ingredients clients need" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instructions</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Keep steps clear and encouraging" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-3">
              {isEdit ? (
                confirmingDelete ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-forest">Delete this recipe?</span>
                    <button type="button" onClick={handleDelete} className="font-semibold text-destructive hover:underline">
                      Yes, delete
                    </button>
                    <button type="button" onClick={() => setConfirmingDelete(false)} className="text-muted-foreground hover:underline">
                      Never mind
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="text-sm font-semibold text-destructive hover:underline"
                  >
                    Delete recipe
                  </button>
                )
              ) : (
                <span />
              )}

              <Button type="submit" disabled={isSaving} className="rounded-full bg-coral text-white hover:bg-coral/90">
                {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Save recipe'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
