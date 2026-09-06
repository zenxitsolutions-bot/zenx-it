// Shared visual scaffold for portal screens whose real feature (data fetching, forms, charts)
// hasn't been ported from legacy/app.js yet — keeps each stub page a one-liner instead of
// repeating the same markup nine times.
export function PlaceholderScreen({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">{eyebrow}</p>
      <h1 className="mt-1.5 mb-3 text-3xl font-semibold text-forest">{title}</h1>
      <p className="max-w-lg text-muted-foreground">{description}</p>
    </div>
  );
}
