// Shared visual scaffold for portal screens whose real feature (data fetching, forms, charts)
// hasn't been ported from legacy/app.js yet — keeps each stub page a one-liner instead of
// repeating the same markup nine times.
export function PlaceholderScreen({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-3xl p-9">
      <p className="text-xs font-bold tracking-widest text-sage-deep">{eyebrow}</p>
      <h1 className="mt-2 mb-3 text-3xl text-forest">{title}</h1>
      <p className="max-w-lg text-muted-foreground">{description}</p>
    </div>
  );
}
