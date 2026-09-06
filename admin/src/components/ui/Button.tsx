import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

/* `secondary` is the app's most-used variant (27 call sites) and now reads as a real filled
   control on a light surface rather than an outline that disappears against the page. `primary`
   keeps the terracotta fill; `ink` is the ivory panel tone, which is the label color that clears
   5.29:1 on it. */
const VARIANTS: Record<Variant, string> = {
  primary: "bg-lime text-white shadow-sm hover:bg-limeDim active:translate-y-px",
  secondary:
    "border border-border bg-surface text-offwhite hover:border-borderStrong hover:bg-panel active:translate-y-px",
  ghost: "text-muted hover:bg-surface hover:text-offwhite",
  danger: "bg-danger text-white shadow-sm hover:brightness-95 active:translate-y-px",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        // A fixed height per size keeps buttons aligned with inputs and with each other when one
        // has an icon and its neighbour doesn't — padding alone let them drift by a pixel or two.
        "inline-flex items-center justify-center rounded-lg font-semibold transition duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40 focus-visible:ring-offset-1 focus-visible:ring-offset-ink",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}
