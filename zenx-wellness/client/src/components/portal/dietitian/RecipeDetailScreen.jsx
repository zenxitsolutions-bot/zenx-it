import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Heart, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useDuplicateRecipe, useRecipe, useToggleRecipeFavorite } from '@/hooks/useRecipes';
import { recipeIngredientList, recipeInstructionSteps } from '@/lib/clientPortal';
import { recipeCategoryLabel, isNoCookTime } from '@/lib/recipeMeta';
import { scaledNutrition, servingFactor, scaleIngredientLine } from '@/lib/recipeNutrition';
import { RecipeMedia } from './RecipeMedia';
import { RecipeFormDialog } from './RecipeFormDialog';

export function RecipeDetailScreen() {
  const { companySlug, recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.role === 'dietitian' || user?.role === 'admin';
  const { data: recipe, isLoading, isError, refetch } = useRecipe(recipeId);
  const [editing, setEditing] = useState(false);
  const [servings, setServings] = useState(1);
  const favorite = useToggleRecipeFavorite();
  const duplicate = useDuplicateRecipe();
  const isShared = recipe?.visibility === 'shared';

  useEffect(() => {
    if (recipe?.servings) setServings(Number(recipe.servings) || 1);
  }, [recipe?._id, recipe?.servings]);

  const factor = recipe ? servingFactor(recipe, servings) : 1;
  const macros = recipe ? scaledNutrition(recipe, servings) : {};
  const ingredients = recipeIngredientList(recipe?.ingredients).map((line) => scaleIngredientLine(line, factor));
  const steps = recipeInstructionSteps(recipe?.instructions);

  return (
    <div className="mx-auto max-w-3xl p-9">
      <Link to={`/${companySlug}/app/recipes`} className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:underline">
        <ArrowLeft className="size-4" /> Recipe library
      </Link>

      {isLoading ? (
        <Skeleton className="mt-6 h-96 w-full" />
      ) : isError || !recipe ? (
        <EmptyState
          title="Recipe not found"
          description="It may have been deleted."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : (
        <article className="mt-5 overflow-hidden rounded-card bg-white shadow-soft">
          <RecipeMedia recipe={recipe} className="h-64 w-full" />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {recipeCategoryLabel(recipe.mealType)} · {recipe.cuisine} · {recipe.dietType}
                  {isShared ? ' · Shared catalog' : ''}
                </p>
                <h1 className="mt-1 text-3xl text-forest">{recipe.title}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => favorite.mutate({ recipeId: recipe._id, favorited: recipe.favorited })}
                >
                  <Heart className={`mr-1 size-4 ${recipe.favorited ? 'fill-current text-coral' : ''}`} />
                  {recipe.favorited ? 'Saved' : 'Favourite'}
                </Button>
                {canManage ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      duplicate.mutate(recipe._id, {
                        onSuccess: (copy) => {
                          toast.success('Recipe duplicated.');
                          navigate(`/${companySlug}/app/recipes/${copy._id}`);
                        },
                        onError: () => toast.error("Couldn't duplicate that recipe."),
                      })
                    }
                  >
                    <Copy className="mr-1 size-4" /> Duplicate
                  </Button>
                ) : null}
                {canManage && !isShared ? (
                  <Button type="button" className="rounded-full bg-coral text-white hover:bg-coral/90" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1 size-4" /> Edit
                  </Button>
                ) : null}
              </div>
            </div>

            {recipe.tags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {recipe.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-sage/40 px-2.5 py-1 text-[11px] font-semibold text-sage-deep">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm min-[640px]:grid-cols-5">
              {[
                ['Prep time', recipe.prepTime],
                ['Cook time', isNoCookTime(recipe.cookTime) ? 'No cooking' : recipe.cookTime],
                ['Total time', recipe.totalTime],
                ['Servings', `${recipe.servings || 1}`],
                ['Portion size', recipe.portionSize || '1 serving'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                  <dd className="font-semibold text-forest">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            <label className="mt-6 flex items-center gap-3 text-sm">
              <span className="font-semibold text-forest">Adjust servings</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value) || 1)}
                className="w-20 rounded-md border border-line px-2 py-1"
              />
              <span className="text-muted-foreground">Ingredient amounts and nutrition scale from {recipe.servings || 1} serving</span>
            </label>

            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm min-[640px]:grid-cols-6">
              {[
                ['Calories', macros.kcal, 'kcal'],
                ['Protein', macros.protein, 'g'],
                ['Carbs', macros.carbs, 'g'],
                ['Fat', macros.fat, 'g'],
                ['Fibre', macros.fiber, 'g'],
                ['Sugar', macros.sugar, 'g'],
              ].map(([label, value, unit]) => (
                <div key={label} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                  <dd className="font-semibold text-forest">{value ? `${value}${unit}` : '—'}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-sm text-muted-foreground">
              Portion: {recipe.portionSize || '1 serving'}
              {recipe.allergens ? ` · Allergens: ${recipe.allergens}` : ''}
              {recipe.suitableMealType ? ` · Best for ${recipeCategoryLabel(recipe.suitableMealType)}` : ''}
            </p>

            {recipe.healthNotes && (
              <p className="mt-4 rounded-xl bg-sage/30 px-4 py-3 text-sm text-forest">{recipe.healthNotes}</p>
            )}

            {isShared && canManage ? (
              <p className="mt-4 text-sm text-muted-foreground">
                This catalog recipe is shared with every active ZenX practice. Duplicate it to customise a copy for your team.
              </p>
            ) : null}

            <h2 className="mt-6 text-lg text-forest">Ingredients</h2>
            <p className="mt-1 text-xs text-muted-foreground">Quantities below are for {servings} serving{servings === 1 ? '' : 's'}.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-forest">
              {ingredients.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>

            <h2 className="mt-6 text-lg text-forest">Method</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-forest">
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>
        </article>
      )}

      {canManage && !isShared ? (
        <RecipeFormDialog
          open={editing}
          onOpenChange={setEditing}
          recipe={recipe}
          onSaved={() => refetch()}
        />
      ) : null}
    </div>
  );
}
