import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * Table shell shared by every list page, so column rhythm, header treatment and row hover are
 * defined once instead of re-derived per page (which is how they drifted apart).
 *
 * The horizontal scroller lives here rather than on each page: a table narrower than its content
 * must scroll inside its own card, never push the whole layout sideways on mobile.
 */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-y border-border bg-surface/60 text-left text-[10px] uppercase tracking-wider text-dim">
        {children}
      </tr>
    </thead>
  );
}

interface SortableThProps extends ThHTMLAttributes<HTMLTableCellElement> {
  /** Present makes the header a sort control. */
  onSort?: () => void;
  direction?: "asc" | "desc" | null;
}

export function TH({ children, className, onSort, direction, ...props }: SortableThProps) {
  const Icon = direction === "asc" ? ArrowUp : direction === "desc" ? ArrowDown : ChevronsUpDown;
  return (
    <th className={cn("px-4 py-2.5 font-semibold", className)} {...props}>
      {onSort ? (
        <button
          onClick={onSort}
          className={cn(
            "inline-flex items-center gap-1 uppercase tracking-wider transition hover:text-offwhite",
            direction && "text-offwhite"
          )}
        >
          {children}
          {/* The neutral glyph stays visible on unsorted columns so it's discoverable that they
              sort at all — revealing it only on hover hides the affordance from touch users. */}
          <Icon size={11} className={cn(!direction && "opacity-40")} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TR({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-border/70 transition last:border-0 hover:bg-surface/70", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TD({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle", className)} {...props}>
      {children}
    </td>
  );
}
