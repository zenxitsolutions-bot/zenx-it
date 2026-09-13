import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a lift on hover. Only for cards that are themselves a link or button — a hover
   *  affordance on a static panel promises an interaction that isn't there. */
  interactive?: boolean;
}

/**
 * The app's surface primitive. Cards sit on the sand page as ivory panels lifted by a hairline
 * border plus a short shadow — not by a heavy drop shadow, which on a light ground reads as a
 * smudge rather than elevation.
 *
 * The old version used `bg-panel/70` + `backdrop-blur-sm`. That was a holdover from the original
 * dark theme, where a translucent panel over a near-black page looked like depth. Over a light
 * page it just muddies the card against whatever it happens to overlap, so the surface is opaque
 * now and the depth comes from the shadow.
 */
export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl2 border border-border bg-panel shadow-card",
        interactive &&
          "transition duration-200 hover:-translate-y-0.5 hover:border-borderStrong hover:shadow-cardHover",
        className
      )}
      {...props}
    />
  );
}

/** Standard card header: title on the left, optional action on the right. */
export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h3 className="font-display text-[15px] text-offwhite">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
