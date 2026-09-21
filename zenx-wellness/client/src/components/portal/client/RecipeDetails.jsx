import { isNoCookTime } from '@/lib/recipeMeta';
import { nutritionSummary, recipeBaseServings } from '@/lib/recipeNutrition';
import { RecipeMedia } from '@/components/portal/dietitian/RecipeMedia';
import { RecipeCookingGuide } from '@/components/portal/shared/RecipeCookingGuide';

export function RecipeDetails({ recipe, notes, servings }) {
  const baseServings = recipeBaseServings(recipe);
  const selectedServings = Number(servings) > 0 ? Number(servings) : baseServings;
  const macros = nutritionSummary(recipe, selectedServings);
  const facts = [
    ['Prep time', recipe?.prepTime],
    ['Cook time', recipe?.cookTime ? (isNoCookTime(recipe.cookTime) ? 'No cooking' : recipe.cookTime) : null],
    ['Total time', recipe?.totalTime],
    ['Recipe serves', recipe ? baseServings : null],
  ].filter(([, value]) => value != null && value !== '');

  if (!recipe && !notes) return null;

  return (
    <div className="mt-4 space-y-5 border-t border-line pt-4 text-sm">
      {recipe?.imageUrl || recipe?.emoji ? <RecipeMedia recipe={recipe} className="h-48 w-full rounded-2xl sm:h-56" /> : null}
      {facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {facts.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-cream px-3 py-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 font-semibold text-forest">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {macros.length > 0 && (
        <section aria-label="Estimated nutrition">
          <h4 className="font-semibold text-forest">Estimated nutrition for {selectedServings} serving{selectedServings === 1 ? '' : 's'}</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {macros.map((macro) => <li key={macro} className="rounded-lg bg-sage/20 px-3 py-2 text-forest">{macro}</li>)}
          </ul>
        </section>
      )}
      {recipe && (
        <dl className="space-y-3 border-y border-line py-4 leading-6">
          {recipe.portionSize && <div><dt className="font-semibold text-forest">Original portion</dt><dd className="text-muted-foreground">{recipe.portionSize}</dd></div>}
          <div><dt className="font-semibold text-forest">Listed allergens</dt><dd className="text-muted-foreground">{recipe.allergens || 'Not specified'}. Check the labels of packaged ingredients too.</dd></div>
        </dl>
      )}
      <RecipeCookingGuide recipe={recipe} servings={selectedServings} headingLevel={4} />
      {recipe?.healthNotes && <p className="rounded-xl bg-sage/20 px-4 py-3 leading-6 text-forest">{recipe.healthNotes}</p>}
      {notes && <p className="rounded-xl border border-line px-4 py-3 leading-6 text-muted-foreground"><span className="font-semibold text-forest">Dietitian note: </span>{notes}</p>}
    </div>
  );
}
