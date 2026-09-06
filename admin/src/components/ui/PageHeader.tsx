import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface PageHeaderProps {
  /** Optional. The topbar already shows the page name, so most pages pass only a description and
   *  actions — repeating the title here would print it twice on the same screen. Detail pages pass
   *  one because their subject (a company, a person) isn't what the topbar is showing. */
  title?: string;
  description?: string;
  /** Result counts, status chips — anything that describes the data rather than acting on it. */
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, meta, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {title && <h2 className="truncate font-display text-xl text-offwhite">{title}</h2>}
        {description && <p className={cn("text-sm text-muted", title && "mt-1")}>{description}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Small neutral count chip, for "12 results" style metadata beside a header. */
export function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-pill border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
      {children}
    </span>
  );
}
