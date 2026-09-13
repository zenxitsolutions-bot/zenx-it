import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { mergeRecipeWithOverride } from '@/lib/planMealRecipe';

const optionalNumber = z.union([z.coerce.number().nonnegative(), z.literal('')]).optional();

const schema = z.object({
  title: z.string().min(1, 'Enter a name'),
  emoji: z.string().max(4).optional(),
  prepTime: z.string().optional(),
  cookTime: z.string().optional(),
  servings: z.coerce.number().positive(),
  portionSize: z.string().optional(),
  kcal: optionalNumber,
  protein: optionalNumber,
  carbs: optionalNumber,
  fat: optionalNumber,
  fiber: optionalNumber,
  sugar: optionalNumber,
  allergens: z.string().optional(),
  healthNotes: z.string().optional(),
  ingredients: z.string().min(1, 'List what the client needs'),
  instructions: z.string().min(1, 'Keep the steps clear'),
});

function num(value) {
  return value === '' || value == null ? undefined : Number(value);
}

function toFormValues(recipe) {
  return {
    title: recipe?.title ?? '',
    emoji: recipe?.emoji ?? '🍽️',
    prepTime: recipe?.prepTime ?? '',
    cookTime: recipe?.cookTime ?? '',
    servings: recipe?.servings ?? 1,
    portionSize: recipe?.portionSize ?? '',
    kcal: recipe?.kcal ?? '',
    protein: recipe?.protein ?? '',
    carbs: recipe?.carbs ?? '',
    fat: recipe?.fat ?? '',
    fiber: recipe?.fiber ?? '',
    sugar: recipe?.sugar ?? '',
    allergens: recipe?.allergens ?? '',
    healthNotes: recipe?.healthNotes ?? '',
    ingredients: recipe?.ingredients ?? '',
    instructions: recipe?.instructions ?? '',
  };
}

export function PlanMealRecipeDialog({ open, onOpenChange, recipe, override, onSave }) {
  const current = mergeRecipeWithOverride(recipe, override) ?? recipe;
  const form = useForm({ resolver: zodResolver(schema), defaultValues: toFormValues(current) });

  useEffect(() => {
    if (open) form.reset(toFormValues(mergeRecipeWithOverride(recipe, override) ?? recipe));
  }, [open, recipe, override, form]);

  function onSubmit(values) {
    const prepMins = Number(String(values.prepTime).replace(/[^\d.]/g, '')) || 0;
    const cookMins = Number(String(values.cookTime || '').replace(/[^\d.]/g, '')) || 0;
    onSave({
      title: values.title.trim(),
      emoji: values.emoji || '🍽️',
      prepTime: values.prepTime?.trim() || undefined,
      cookTime: values.cookTime?.trim() || undefined,
      totalTime: `${prepMins + cookMins} min`,
      servings: Number(values.servings) || 1,
      portionSize: values.portionSize?.trim() || null,
      kcal: num(values.kcal),
      protein: num(values.protein),
      carbs: num(values.carbs),
      fat: num(values.fat),
      fiber: num(values.fiber),
      sugar: num(values.sugar),
      allergens: values.allergens?.trim() || null,
      healthNotes: values.healthNotes?.trim() || null,
      ingredients: values.ingredients,
      instructions: values.instructions,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit recipe for this client</DialogTitle>
          <DialogDescription>
            Changes apply only to this weekly plan. They are not saved to the shared recipe library.
            If you save this week for reuse, the edited version is kept on that saved plan.
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
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

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
              <FormField control={form.control} name="portionSize" render={({ field }) => (
                <FormItem>
                  <FormLabel>Portion</FormLabel>
                  <FormControl><Input placeholder="1 bowl" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

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
                <FormControl><Input placeholder="Dairy, Gluten" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="ingredients" render={({ field }) => (
              <FormItem>
                <FormLabel>Ingredients (one per line)</FormLabel>
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
                <FormLabel>Notes for this client</FormLabel>
                <FormControl><Textarea rows={2} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-full bg-coral text-white hover:bg-coral/90">
                Save on this plan
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
