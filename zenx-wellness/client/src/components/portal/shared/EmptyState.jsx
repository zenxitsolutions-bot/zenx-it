export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-sage bg-cream/60 px-6 py-10 text-center">
      {Icon && (
        // The icon sits in a soft ring rather than floating on the panel — enough of an
        // illustration to make an empty screen feel deliberate, without shipping artwork.
        <span className="mb-1 grid size-14 place-items-center rounded-full bg-white text-brand-strong shadow-soft ring-8 ring-sage/50">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-semibold text-forest">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
