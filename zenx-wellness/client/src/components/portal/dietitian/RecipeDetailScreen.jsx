import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Heart, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useDuplicateRecipe, useRecipe, useToggleRecipeFavorite } from '@/hooks/useRecipes';
import { recipeCategoryLabel, isNoCookTime } from '@/lib/recipeMeta';
import { scaledNutrition } from '@/lib/recipeNutrition';
import { RecipeCookingGuide } from '@/components/portal/shared/RecipeCookingGuide';
import { RecipeMedia } from './RecipeMedia';
import { RecipeFormDialog } from './RecipeFormDialog';
import { hasPermission } from '@/lib/permissions';

export function RecipeDetailScreen() {
  const { companySlug, recipeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = hasPermission(user, 'recipes.manage');
  const { data: recipe, isLoading, isError, refetch } = useRecipe(recipeId);
  const [editing, setEditing] = useState(false);
  const [servings, setServings] = useState(1);
  const favorite = useToggleRecipeFavorite();
  const duplicate = useDuplicateRecipe();
  const isShared = recipe?.visibility === 'shared';

  useEffect(() => {
    if (recipe?.servings) setServings(Number(recipe.servings) || 1);
  }, [recipe?._id, recipe?.id, recipe?.servings]);

  const macros = recipe ? scaledNutrition(recipe, servings) : {};

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-7 lg:p-9">
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
          <div className="p-4 sm:p-7">
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

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                ['Prep time', recipe.prepTime],
                ['Cook time', recipe.cookTime ? (isNoCookTime(recipe.cookTime) ? 'No cooking' : recipe.cookTime) : 'Not specified'],
                ['Total time', recipe.totalTime],
                ['Recipe serves', `${recipe.servings || 1}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                  <dd className="font-semibold text-forest">{value || '—'}</dd>
                </div>
              ))}
            </dl>

            <label className="mt-6 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold text-forest">Adjust servings</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={servings}
                onChange={(e) => setServings(Math.max(0.5, Number(e.target.value) || 1))}
                className="w-20 rounded-md border border-line px-2 py-1"
              />
              <span className="text-muted-foreground">Ingredient amounts and estimated nutrition scale from {recipe.servings || 1} serving{Number(recipe.servings || 1) === 1 ? '' : 's'}.</span>
            </label>

            <h2 className="mt-6 text-sm font-semibold text-forest">Estimated nutrition for {servings} serving{servings === 1 ? '' : 's'}</h2>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
              {[
                ['Calories', macros.kcal, 'kcal', 'kcal'],
                ['Protein', macros.protein, 'g', 'protein'],
                ['Carbs', macros.carbs, 'g', 'carbs'],
                ['Fat', macros.fat, 'g', 'fat'],
                ['Fibre', macros.fiber, 'g', 'fiber'],
                ['Sugar', macros.sugar, 'g', 'sugar'],
              ].map(([label, value, unit, field]) => (
                <div key={label} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
                  <dd className="font-semibold text-forest">{recipe[field] != null && recipe[field] !== '' ? `${value} ${unit}` : '—'}</dd>
                </div>
              ))}
            </dl>

            <dl className="mt-5 space-y-3 border-y border-line py-4 text-sm leading-6">
              <div><dt className="font-semibold text-forest">Original portion</dt><dd className="text-muted-foreground">{recipe.portionSize || '1 serving'}</dd></div>
              <div><dt className="font-semibold text-forest">Listed allergens</dt><dd className="text-muted-foreground">{recipe.allergens || 'Not specified'}. Check the labels of packaged ingredients too.</dd></div>
              {recipe.suitableMealType && <div><dt className="font-semibold text-forest">Best for</dt><dd className="text-muted-foreground">{recipeCategoryLabel(recipe.suitableMealType)}</dd></div>}
            </dl>

            {recipe.healthNotes && (
              <p className="mt-4 rounded-xl bg-sage/30 px-4 py-3 text-sm text-forest">{recipe.healthNotes}</p>
            )}

            {isShared && canManage ? (
              <p className="mt-4 text-sm text-muted-foreground">
                This catalog recipe is shared with every active ZenX practice. Duplicate it to customise a copy for your team.
              </p>
            ) : null}

            <RecipeCookingGuide recipe={recipe} servings={servings} />
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
