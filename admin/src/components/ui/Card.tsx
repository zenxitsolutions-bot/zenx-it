import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl2 border border-border bg-panel/70 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}
