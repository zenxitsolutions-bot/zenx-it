import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { FIXED_RECIPE_CATEGORIES } from '@/lib/recipeCategories';
import { recipeCategoryLabel } from '@/lib/recipeMeta';
import { recommendRecipes } from '@/lib/recipeRecommend';
import { RecipeRailCard } from './RecipeRailCard';

export function RecipeRail({ recipes, client }) {
  const { companySlug } = useParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const recommended = useMemo(() => {
    if (!client) return [];
    return recommendRecipes(recipes, {
      dietPreference: client.dietPreference,
      allergies: client.allergies,
      programName: client.programPlan?.name ?? '',
    }).slice(0, 6);
  }, [recipes, client]);

  // The 4 fixed categories always show as anchor tabs; any custom category present in `recipes`
  // (the full set — filtering below is client-side only) is appended after them.
  const filters = useMemo(() => {
    const extra = new Set();
    for (const recipe of recipes) {
      if (!FIXED_RECIPE_CATEGORIES.includes(recipe.mealType)) extra.add(recipe.mealType);
    }
    return ['All', ...FIXED_RECIPE_CATEGORIES, ...[...extra].sort()];
  }, [recipes]);

  const matched = useMemo(
    () =>
      recipes.filter(
        (r) => (filter === 'All' || r.mealType === filter) && r.title.toLowerCase().includes(search.toLowerCase())
      ),
    [recipes, filter, search]
  );
  const capped = filter === 'All' && !search.trim() && matched.length > 40;
  const visible = useMemo(() => (capped ? matched.slice(0, 40) : matched), [capped, matched]);

  return (
    <aside className="sticky top-[86px] rounded-card bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl">Recipe library</h2>
          <span className="text-xs text-muted-foreground">Drag into the schedule</span>
        </div>
        <Link to={`/${companySlug}/app/recipes`} className="text-xs font-semibold whitespace-nowrap text-forest hover:underline">
          Manage recipes →
        </Link>
      </div>

      <Input
        placeholder="Search recipes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mt-4"
      />

      {recommended.length > 0 ? (
        <div className="mt-3 border-b border-line pb-3">
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Suggested for {client.name}
          </p>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {recommended.slice(0, 4).map((recipe) => (
              <div key={`rec-${recipe._id}`} className="w-[168px] shrink-0">
                <RecipeRailCard recipe={recipe} dragIdPrefix="recommended" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-2">
        {filters.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={cn(
              'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold',
              filter === type ? 'bg-forest text-white' : 'bg-cream text-forest hover:bg-sage/50'
            )}
          >
              {type === 'All' ? 'All' : recipeCategoryLabel(type)}
          </button>
        ))}
      </div>

      <div className="mt-2 grid max-h-[min(520px,calc(100vh-280px))] gap-2 overflow-y-auto pr-1">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">No recipes match.</p>
        ) : (
          <>
            {visible.map((recipe) => (
              <RecipeRailCard key={recipe._id} recipe={recipe} />
            ))}
            {capped ? (
              <p className="py-2 text-center text-[10px] text-muted-foreground">
                Showing 40 of {matched.length}. Search or pick a category to see the rest.
              </p>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
