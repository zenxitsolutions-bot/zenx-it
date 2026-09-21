import { useState } from 'react';
import { recipeIngredientList, recipeInstructionSteps } from '@/lib/clientPortal';
import { recipeBaseServings, scaleIngredientLine, servingFactor } from '@/lib/recipeNutrition';

function IngredientChecklist({ ingredients }) {
  const [checked, setChecked] = useState(new Set());
  return (
    <>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span aria-live="polite">{checked.size} of {ingredients.length} ingredients ready</span>
        <button type="button" disabled={!checked.size} onClick={() => setChecked(new Set())} className="rounded px-2 py-1 font-semibold text-forest underline underline-offset-2 disabled:opacity-40">Reset checklist</button>
      </div>
      <ul role="list" className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
        {ingredients.map((item, index) => (
          <li key={`${item}-${index}`}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 hover:bg-sage/15">
              <input type="checkbox" checked={checked.has(index)} onChange={() => setChecked((previous) => {
                const next = new Set(previous);
                if (next.has(index)) next.delete(index); else next.add(index);
                return next;
              })} className="mt-1 size-4 shrink-0 accent-forest" />
              <span className={`min-w-0 text-sm leading-6 ${checked.has(index) ? 'text-muted-foreground line-through' : 'text-forest'}`}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </>
  );
}

export function RecipeCookingGuide({ recipe, servings, headingLevel = 2 }) {
  const baseServings = recipeBaseServings(recipe);
  const selectedServings = Number(servings) > 0 ? Number(servings) : baseServings;
  const factor = servingFactor(recipe, selectedServings);
  const ingredients = recipeIngredientList(recipe?.ingredients).map((line) => scaleIngredientLine(line, factor));
  const steps = recipeInstructionSteps(recipe?.instructions);
  const Heading = `h${headingLevel}`;
  return (
    <div className="mt-7 space-y-8">
      {ingredients.length > 0 && (
        <section aria-label="Ingredients">
          <Heading className="text-lg font-semibold text-forest">Ingredients</Heading>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Quantities for {selectedServings} serving{selectedServings === 1 ? '' : 's'}. Tick each ingredient as you prepare it.</p>
          <IngredientChecklist key={`${recipe?._id || recipe?.id || recipe?.title}-${ingredients.join('\n')}`} ingredients={ingredients} />
        </section>
      )}
      {steps.length > 0 && (
        <section aria-label="Cooking method">
          <Heading className="text-lg font-semibold text-forest">Step-by-step method</Heading>
          <p className="mt-2 rounded-xl bg-sage/20 px-4 py-3 text-sm leading-6 text-forest">
            Method quantities and portion descriptions are for the original {baseServings} serving{baseServings === 1 ? '' : 's'}.
            {factor !== 1 ? ' Use the adjusted ingredient list above for your selected servings; quantities written inside the steps have not been multiplied.' : ''}
            {' '}Cooking times are approximate. Check the stated texture and doneness; times do not simply multiply with servings.
          </p>
          <ol role="list" className="mt-4 space-y-3">
            {steps.map((step, index) => (
              <li key={`${index}-${step}`} className="flex gap-3 rounded-xl border border-line px-4 py-4 sm:gap-4 sm:p-5">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-semibold text-white">{index + 1}</span>
                <p className="min-w-0 pt-0.5 text-sm leading-7 text-forest sm:text-base"><span className="sr-only">Step {index + 1}. </span>{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
