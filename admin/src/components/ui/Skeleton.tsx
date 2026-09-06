import { cn } from "../../utils/cn";

/**
 * Loading placeholder. The sweep is a moving highlight over a static base rather than a pulsing
 * opacity: a whole grid of elements fading in and out together reads as the page flickering,
 * while a sweep reads as work in progress.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[104px] w-full rounded-xl2" />
      ))}
    </div>
  );
}

/** Matches the dashboard's two-column analytics row so the page doesn't jump when data lands. */
export function SkeletonPanels() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <Skeleton className="h-80 w-full rounded-xl2" />
      <Skeleton className="h-80 w-full rounded-xl2" />
    </div>
  );
}
