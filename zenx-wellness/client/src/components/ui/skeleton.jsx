import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-card bg-sage/60", className)} {...props} />
}

export { Skeleton }
