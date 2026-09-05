// The "page-title-row" pattern from legacy/styles.css: eyebrow greeting, heading, description,
// and an optional primary action on the right.
export function ScreenHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl text-forest">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
