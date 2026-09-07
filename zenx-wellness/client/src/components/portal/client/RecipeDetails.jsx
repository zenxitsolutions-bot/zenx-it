import { recipeIngredientList, recipeInstructionSteps } from '@/lib/clientPortal';

export function RecipeDetails({ recipe, notes }) {
  const ingredients = recipeIngredientList(recipe?.ingredients);
  const steps = recipeInstructionSteps(recipe?.instructions);
  const macros = [
    recipe?.kcal ? `${recipe.kcal} kcal` : null,
    recipe?.protein ? `${recipe.protein}g protein` : null,
    recipe?.prepTime || null,
  ].filter(Boolean);

  if (!macros.length && !ingredients.length && !steps.length && !notes) return null;

  return (
    <div className="mt-4 space-y-3 border-t border-line pt-4 text-sm">
      {macros.length > 0 && (
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{macros.join(' · ')}</p>
      )}
      {ingredients.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Ingredients</h4>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-forest">
            {ingredients.map((item, i) => (
              <li key={`${item}-${i}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {steps.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold tracking-wide text-brand-strong uppercase">How to make it</h4>
          {steps.length === 1 ? (
            <p className="mt-1.5 leading-relaxed text-forest">{steps[0]}</p>
          ) : (
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 leading-relaxed text-forest">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          )}
        </div>
      )}
      {notes ? (
        <p className="text-muted-foreground">
          <span className="font-semibold text-forest">Note: </span>
          {notes}
        </p>
      ) : null}
    </div>
  );
}
