import type { LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils/cn";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
}

export function KpiCard({ label, value, icon: Icon, accent }: KpiCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            accent ? "bg-lime/10 text-lime" : "bg-ink text-muted"
          )}
        >
          <Icon size={15} />
        </span>
      </div>
      <span className="font-display text-3xl text-offwhite">{value}</span>
    </Card>
  );
}
