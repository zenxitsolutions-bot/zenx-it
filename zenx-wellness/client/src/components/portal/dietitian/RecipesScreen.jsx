import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Heart, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useRecipes, useToggleRecipeFavorite } from '@/hooks/useRecipes';
import { cn } from '@/lib/utils';
import { FIXED_RECIPE_CATEGORIES } from '@/lib/recipeCategories';
import { recipeCategoryLabel } from '@/lib/recipeMeta';
import { RecipeCard } from './RecipeCard';
import { RecipeFormDialog } from './RecipeFormDialog';

const QUICK_FILTERS = [
  { id: 'veg', label: 'Vegetarian', dietType: 'Vegetarian' },
  { id: 'nonveg', label: 'Non-vegetarian', dietType: 'Non-Vegetarian' },
  { id: 'hp', label: 'High Protein', tag: 'High Protein' },
  { id: 'wl', label: 'Weight Loss', tag: 'Weight Loss' },
  { id: 'wg', label: 'Weight Gain', tag: 'Weight Gain' },
  { id: 'fav', label: 'Favourites', favorite: true },
];

const CALORIE_FILTERS = [
  { id: 'any', label: 'Any calories', maxKcal: undefined },
  { id: '300', label: 'Under 300 kcal', maxKcal: 300 },
  { id: '450', label: 'Under 450 kcal', maxKcal: 450 },
  { id: '600', label: 'Under 600 kcal', maxKcal: 600 },
];

const PAGE_SIZE = 48;

export function RecipesScreen() {
  const navigate = useNavigate();
  const { companySlug } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'dietitian' || user?.role === 'admin';
  const [mealType, setMealType] = useState('All');
  const [search, setSearch] = useState('');
  const [quick, setQuick] = useState(null);
  const [calorie, setCalorie] = useState('any');
  const [dialog, setDialog] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchParams, setSearchParams] = useSearchParams();
  const favorite = useToggleRecipeFavorite();

  useEffect(() => {
    if (!canManage || searchParams.get('create') !== '1') return;
    setDialog({ recipe: null });
    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [canManage, searchParams, setSearchParams]);

  const params = useMemo(() => {
    const next = {};
    if (mealType !== 'All') next.mealType = mealType;
    const active = QUICK_FILTERS.find((item) => item.id === quick);
    if (active?.dietType) next.dietType = active.dietType;
    if (active?.tag) next.tag = active.tag;
    if (active?.favorite) next.favorite = '1';
    const cal = CALORIE_FILTERS.find((item) => item.id === calorie);
    if (cal?.maxKcal) next.maxKcal = cal.maxKcal;
    return Object.keys(next).length ? next : undefined;
  }, [mealType, quick, calorie]);

  const { data, isLoading, isError, refetch } = useRecipes(params);
  const needle = search.trim().toLowerCase();
  const visible = (data ?? []).filter((recipe) => {
    if (!needle) return true;
    return `${recipe.title} ${recipe.ingredients ?? ''}`.toLowerCase().includes(needle);
  });
  const shown = visible.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [mealType, quick, calorie, search]);

  const mealTypeTabs = useMemo(() => {
    const extra = new Set();
    for (const recipe of data ?? []) {
      if (!FIXED_RECIPE_CATEGORIES.includes(recipe.mealType)) extra.add(recipe.mealType);
    }
    return ['All', ...FIXED_RECIPE_CATEGORIES, ...[...extra].sort()];
  }, [data]);

  return (
    <div className="mx-auto max-w-6xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Healthy Indian recipes for weekly plans</p>
          <h1 className="mt-1 text-3xl text-forest">Recipe library</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            {data?.length ? `${data.length} healthy Indian recipes. ` : ''}
            Shared with every active ZenX practice. Search the catalog, filter by meal and goals
            {canManage ? ', then drop recipes into a client plan. Nutrition scales with serving size.' : '.'}
          </p>
        </div>
        {canManage ? (
          <Button onClick={() => setDialog({ recipe: null })} className="rounded-full bg-coral text-white hover:bg-coral/90">
            + Create recipe
          </Button>
        ) : null}
      </div>

      <div className="mb-5 grid gap-3">
        <Input
          placeholder="Search recipes, ingredients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
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
              {type === 'All' ? 'All' : recipeCategoryLabel(type)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuick(quick === item.id ? null : item.id)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                quick === item.id ? 'border-coral bg-coral/10 text-coral' : 'border-line text-muted-foreground hover:border-coral hover:text-coral'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CALORIE_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCalorie(item.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                calorie === item.id ? 'bg-forest text-white' : 'bg-cream text-forest hover:bg-sage/50'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
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
          title="No recipes match"
          description="Try a different search or filter, or create a custom recipe."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            Showing {shown.length} of {visible.length}
          </p>
          <div className="grid grid-cols-2 gap-4 min-[900px]:grid-cols-3">
            {shown.map((recipe) => (
              <RecipeCard
                key={recipe._id}
                recipe={recipe}
                onClick={() => navigate(`/${companySlug}/app/recipes/${recipe._id}`)}
                onToggleFavorite={() => favorite.mutate({ recipeId: recipe._id, favorited: recipe.favorited })}
                favoritePending={favorite.isPending}
              />
            ))}
          </div>
          {shown.length < visible.length ? (
            <div className="mt-6 flex justify-center">
              <Button type="button" variant="outline" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                Show more recipes
              </Button>
            </div>
          ) : null}
        </>
      )}

      {canManage ? (
        <RecipeFormDialog
          open={Boolean(dialog)}
          onOpenChange={(open) => !open && setDialog(null)}
          recipe={dialog?.recipe}
        />
      ) : null}
    </div>
  );
}
