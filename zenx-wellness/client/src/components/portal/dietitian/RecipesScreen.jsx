import { useMemo, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useRecipes } from '@/hooks/useRecipes';
import { cn } from '@/lib/utils';
import { FIXED_RECIPE_CATEGORIES } from '@/lib/recipeCategories';
import { RecipeCard } from './RecipeCard';
import { RecipeFormDialog } from './RecipeFormDialog';

export function RecipesScreen() {
  const [mealType, setMealType] = useState('All');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState(null);
  const [dialog, setDialog] = useState(null); // { recipe: null | recipe }

  const { data, isLoading, isError, refetch } = useRecipes(
    mealType === 'All' ? undefined : { mealType }
  );

  // The 4 fixed categories always show as anchor tabs; any custom category found in the
  // currently-loaded recipes is appended after them — same derive-from-data approach the tags
  // filter below already uses, with the same limitation (a custom category not present in the
  // current filter's results won't show as a tab until "All" is selected again).
  const mealTypeTabs = useMemo(() => {
    const extra = new Set();
    for (const recipe of data ?? []) {
      if (!FIXED_RECIPE_CATEGORIES.includes(recipe.mealType)) extra.add(recipe.mealType);
    }
    return ['All', ...FIXED_RECIPE_CATEGORIES, ...[...extra].sort()];
  }, [data]);

  const allTags = useMemo(() => {
    const tags = new Set();
    for (const recipe of data ?? []) for (const tag of recipe.tags ?? []) tags.add(tag);
    return [...tags].sort();
  }, [data]);

  const visible = (data ?? []).filter((recipe) => {
    const matchesSearch = recipe.title.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !activeTag || recipe.tags?.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="mx-auto max-w-5xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Shared by your whole care team</p>
          <h1 className="mt-1 text-3xl text-forest">Recipe library</h1>
          <p className="mt-1 text-muted-foreground">Create practical, nourishing recipes once and use them in every weekly plan.</p>
        </div>
        <Button onClick={() => setDialog({ recipe: null })} className="rounded-full bg-coral text-white hover:bg-coral/90">
          + Create recipe
        </Button>
      </div>

      <div className="mb-4 grid gap-3">
        <Input
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex flex-wrap gap-1.5">
          {mealTypeTabs.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMealType(type)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold',
                mealType === type ? 'bg-forest text-white' : 'bg-sage/40 text-forest hover:bg-sage/60'
              )}
            >
              {type}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                  activeTag === tag ? 'border-coral bg-coral/10 text-coral' : 'border-line text-muted-foreground hover:border-coral hover:text-coral'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load recipes"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title={data?.length ? 'No recipes match' : 'No recipes yet'}
          description={data?.length ? 'Try a different search or filter.' : 'Create your first recipe to start building weekly plans.'}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 min-[900px]:grid-cols-3">
          {visible.map((recipe) => (
            <RecipeCard key={recipe._id} recipe={recipe} onClick={() => setDialog({ recipe })} />
          ))}
        </div>
      )}

      <RecipeFormDialog
        open={Boolean(dialog)}
        onOpenChange={(open) => !open && setDialog(null)}
        recipe={dialog?.recipe}
      />
    </div>
  );
}
