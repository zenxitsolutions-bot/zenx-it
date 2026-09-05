import type { ServicePerformance } from "../../services/analytics";

export function ServicePerformanceList({ data }: { data: ServicePerformance[] }) {
  const sorted = [...data].sort((a, b) => b.total - a.total);
  return (
    <div className="flex flex-col gap-4">
      {sorted.map((s) => (
        <div key={s.service}>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-offwhite">{s.service}</span>
            <span className="text-dim">
              {s.share.toFixed(0)}% · {s.conversionRate.toFixed(0)}% converted
            </span>
          </div>
          <div className="h-2 rounded-full bg-border">
            <div className="h-2 rounded-full bg-lime" style={{ width: `${s.share}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
