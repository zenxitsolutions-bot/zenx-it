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
import { useCreateRecipe, useUpdateRecipe, useDeleteRecipe, useUploadRecipeImage } from '@/hooks/useRecipes';
import { RECIPE_CATEGORIES, FIXED_RECIPE_CATEGORIES } from '@/lib/recipeCategories';
import { DIETARY_TAGS, RECIPE_DIET_TYPES, recipeCategoryLabel } from '@/lib/recipeMeta';

const optionalNumber = z.union([z.coerce.number().nonnegative(), z.literal('')]).optional();

const schema = z
  .object({
    title: z.string().min(1, 'Enter a name'),
    emoji: z.string().max(4).optional(),
    category: z.string().min(1),
    customCategory: z.string().optional(),
    cuisine: z.string().optional(),
    dietType: z.enum(RECIPE_DIET_TYPES),
    prepTime: z.string().min(1, 'e.g. 15 min'),
    cookTime: z.string().optional(),
    servings: z.coerce.number().positive(),
    portionSize: z.string().optional(),
    tags: z.string().optional(),
    kcal: optionalNumber,
    protein: optionalNumber,
    carbs: optionalNumber,
    fat: optionalNumber,
    fiber: optionalNumber,
    sugar: optionalNumber,
    allergens: z.string().optional(),
    healthNotes: z.string().optional(),
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
  cuisine: 'Indian',
  dietType: 'Vegetarian',
  prepTime: '',
  cookTime: '',
  servings: 1,
  portionSize: '1 serving',
  tags: '',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
  fiber: '',
  sugar: '',
  allergens: '',
  healthNotes: '',
  ingredients: '',
  instructions: '',
};

function num(value) {
  return value === '' || value == null ? undefined : Number(value);
}

function toFormValues(recipe) {
  if (!recipe) return EMPTY;
  const isCustom = !FIXED_RECIPE_CATEGORIES.includes(recipe.mealType);
  return {
    title: recipe.title,
    emoji: recipe.emoji ?? '🍽️',
    category: isCustom ? 'Custom' : recipe.mealType,
    customCategory: isCustom ? recipe.mealType : '',
    cuisine: recipe.cuisine ?? 'Indian',
    dietType: RECIPE_DIET_TYPES.includes(recipe.dietType) ? recipe.dietType : 'Vegetarian',
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime ?? '',
    servings: recipe.servings ?? 1,
    portionSize: recipe.portionSize ?? '',
    tags: (recipe.tags ?? []).join(', '),
    kcal: recipe.kcal ?? '',
    protein: recipe.protein ?? '',
    carbs: recipe.carbs ?? '',
    fat: recipe.fat ?? '',
    fiber: recipe.fiber ?? '',
    sugar: recipe.sugar ?? '',
    allergens: recipe.allergens ?? '',
    healthNotes: recipe.healthNotes ?? '',
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  };
}

function toPayload(values) {
  const mealType = values.category === 'Custom' ? values.customCategory.trim() : values.category;
  const cookTime = values.cookTime?.trim() || undefined;
  const prepMins = Number(String(values.prepTime).replace(/[^\d.]/g, '')) || 0;
  const cookMins = Number(String(values.cookTime || '').replace(/[^\d.]/g, '')) || 0;
  return {
    title: values.title,
    emoji: values.emoji || '🍽️',
    mealType,
    cuisine: values.cuisine || 'Indian',
    dietType: values.dietType,
    prepTime: values.prepTime,
    cookTime,
    totalTime: `${prepMins + cookMins} min`,
    servings: Number(values.servings) || 1,
    portionSize: values.portionSize || null,
    tags: values.tags ? values.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    kcal: num(values.kcal),
    protein: num(values.protein),
    carbs: num(values.carbs),
    fat: num(values.fat),
    fiber: num(values.fiber),
    sugar: num(values.sugar),
    allergens: values.allergens || null,
    suitableMealType: mealType,
    healthNotes: values.healthNotes || null,
    ingredients: values.ingredients,
    instructions: values.instructions,
  };
}

export function RecipeFormDialog({ open, onOpenChange, recipe, onSaved }) {
  const isEdit = Boolean(recipe);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  const deleteRecipe = useDeleteRecipe();
  const uploadImage = useUploadRecipeImage();
  const isSaving = createRecipe.isPending || updateRecipe.isPending || uploadImage.isPending;

  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(recipe) });
  const category = form.watch('category');
  const tagsValue = form.watch('tags') ?? '';

  useEffect(() => {
    if (open) {
      form.reset(toFormValues(recipe));
      setConfirmingDelete(false);
      setImageFile(null);
    }
  }, [open, recipe, form]);

  function toggleTag(tag) {
    const current = tagsValue.split(',').map((t) => t.trim()).filter(Boolean);
    const next = current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag];
    form.setValue('tags', next.join(', '));
  }

  async function onSubmit(values) {
    const payload = toPayload(values);
    try {
      let saved;
      if (isEdit) {
        saved = await updateRecipe.mutateAsync({ recipeId: recipe._id, ...payload });
      } else {
        saved = await createRecipe.mutateAsync(payload);
      }
      if (imageFile && saved?._id) {
        await uploadImage.mutateAsync({ recipeId: saved._id, file: imageFile });
      }
      toast.success(isEdit ? 'Recipe updated.' : 'Recipe created.');
      onOpenChange(false);
      onSaved?.(saved);
    } catch {
      toast.error("We couldn't save that — please try again.");
    }
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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit recipe' : 'Create a recipe'}</DialogTitle>
          <DialogDescription>
            Custom recipes stay on your practice. The Healthy Indian catalog is already shared with every active ZenX customer.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <div className="grid grid-cols-[64px_1fr] gap-3">
              <FormField control={form.control} name="emoji" render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <FormControl><Input {...field} className="text-center text-lg" maxLength={4} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipe name</FormLabel>
                  <FormControl><Input placeholder="e.g. Palak Paneer" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RECIPE_CATEGORIES.map((type) => (
                        <SelectItem key={type} value={type}>{type === 'Custom' ? 'Custom' : recipeCategoryLabel(type)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dietType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Vegetarian / non-veg</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {RECIPE_DIET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {category === 'Custom' && (
              <FormField control={form.control} name="customCategory" render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom category</FormLabel>
                  <FormControl><Input placeholder="e.g. Pre-workout" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-4">
              <FormField control={form.control} name="prepTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prep time</FormLabel>
                  <FormControl><Input placeholder="10 min" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cookTime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cook time</FormLabel>
                  <FormControl><Input placeholder="15 min" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="servings" render={({ field }) => (
                <FormItem>
                  <FormLabel>Servings</FormLabel>
                  <FormControl><Input type="number" min="0.5" step="0.5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cuisine" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cuisine</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="portionSize" render={({ field }) => (
              <FormItem>
                <FormLabel>Portion size</FormLabel>
                <FormControl><Input placeholder="1 bowl / 1 glass" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div>
              <p className="mb-2 text-sm font-medium">Dietary tags</p>
              <div className="flex flex-wrap gap-1.5">
                {DIETARY_TAGS.map((tag) => {
                  const active = tagsValue.split(',').map((t) => t.trim()).includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={active ? 'rounded-full bg-forest px-2.5 py-1 text-[11px] font-semibold text-white' : 'rounded-full bg-sage/40 px-2.5 py-1 text-[11px] font-semibold text-forest'}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField control={form.control} name="tags" render={({ field }) => (
              <FormItem>
                <FormLabel>Tags (comma-separated)</FormLabel>
                <FormControl><Input placeholder="High Protein, Vegetarian" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-3 gap-3 min-[640px]:grid-cols-6">
              {['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'].map((name) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{name === 'kcal' ? 'Calories' : name}</FormLabel>
                    <FormControl><Input type="number" min="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
            </div>

            <FormField control={form.control} name="allergens" render={({ field }) => (
              <FormItem>
                <FormLabel>Allergens</FormLabel>
                <FormControl><Input placeholder="Dairy, Gluten, Peanuts" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="ingredients" render={({ field }) => (
              <FormItem>
                <FormLabel>Ingredients (one per line, with quantities)</FormLabel>
                <FormControl><Textarea rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="instructions" render={({ field }) => (
              <FormItem>
                <FormLabel>Cooking instructions</FormLabel>
                <FormControl><Textarea rows={4} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="healthNotes" render={({ field }) => (
              <FormItem>
                <FormLabel>Healthier prep notes</FormLabel>
                <FormControl><Textarea rows={2} placeholder="Controlled oil, lean protein, millet swap…" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div>
              <p className="mb-1 text-sm font-medium">Recipe image</p>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="flex items-center justify-between gap-3">
              {isEdit && recipe?.visibility !== 'shared' ? (
                confirmingDelete ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-forest">Delete this recipe?</span>
                    <button type="button" onClick={handleDelete} className="font-semibold text-destructive hover:underline">Yes, delete</button>
                    <button type="button" onClick={() => setConfirmingDelete(false)} className="text-muted-foreground hover:underline">Never mind</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmingDelete(true)} className="text-sm font-semibold text-destructive hover:underline">
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
