export function RecipeCard({ recipe, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-card bg-white p-4 text-left shadow-soft transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-peach text-2xl">{recipe.emoji}</div>
        <div className="min-w-0">
          <strong className="block text-forest">{recipe.title}</strong>
          <span className="text-xs text-muted-foreground">
            {recipe.mealType} · {recipe.prepTime}
          </span>
        </div>
      </div>

      {recipe.tags?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-sage/40 px-2 py-0.5 text-[10px] font-semibold text-sage-deep">
              {tag}
            </span>
          ))}
        </div>
      )}

      {(recipe.kcal || recipe.protein) && (
        <p className="mt-2 text-xs text-muted-foreground">
          {recipe.kcal ? `${recipe.kcal} kcal` : ''}
          {recipe.kcal && recipe.protein ? ' · ' : ''}
          {recipe.protein ? `${recipe.protein}g protein` : ''}
        </p>
      )}
    </button>
  );
}
