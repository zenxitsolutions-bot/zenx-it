// The "page-title-row" pattern from legacy/styles.css: eyebrow greeting, heading, description,
// and an optional primary action on the right.
export function ScreenHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">{eyebrow}</p>
        )}
        <h1 className="mt-1.5 text-3xl font-semibold text-forest">{title}</h1>
        {description && <p className="mt-1.5 max-w-xl text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
