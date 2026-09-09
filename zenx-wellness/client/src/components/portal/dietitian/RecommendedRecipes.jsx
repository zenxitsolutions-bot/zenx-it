import { recommendRecipes } from '@/lib/recipeRecommend';
import { dietPreferenceLabel } from '@/lib/dietPreferences';
import { RecipeRailCard } from './RecipeRailCard';

export function RecommendedRecipes({ recipes, client, onAssign }) {
  if (!client) return null;
  const programName = client.programPlan?.name ?? '';
  const recommended = recommendRecipes(recipes, {
    dietPreference: client.dietPreference,
    allergies: client.allergies,
    programName,
  }).slice(0, 8);

  if (recommended.length === 0) return null;

  return (
    <section className="mb-4 rounded-card bg-white p-4 shadow-soft">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg text-forest">Recommended for {client.name}</h2>
        <p className="text-xs text-muted-foreground">
          {dietPreferenceLabel(client.dietPreference)}
          {programName ? ` · ${programName}` : ''}
          {client.allergies ? ` · avoid ${client.allergies}` : ''}
        </p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Drag onto a meal slot, or pick from the slot dropdown.</p>
      <div className="grid gap-2 min-[720px]:grid-cols-2">
        {recommended.map((recipe) => (
          <RecipeRailCard key={recipe._id} recipe={recipe} dragIdPrefix="recommended" />
        ))}
      </div>
    </section>
  );
}
