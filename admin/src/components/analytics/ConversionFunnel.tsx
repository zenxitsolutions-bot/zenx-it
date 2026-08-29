import type { FunnelStage } from "../../services/analytics";

export function ConversionFunnel({ stages }: { stages: FunnelStage[] }) {
  const max = stages[0]?.count || 1;

  return (
    <div className="flex flex-col gap-3">
      {stages.map((stage, idx) => {
        const width = Math.max((stage.count / max) * 100, stage.count > 0 ? 8 : 2);
        const prevCount = idx > 0 ? stages[idx - 1].count : null;
        const dropRate = prevCount ? Math.round(((prevCount - stage.count) / prevCount) * 100) : null;
        return (
          <div key={stage.stage}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-offwhite">{stage.stage}</span>
              <span className="text-dim">
                {stage.count.toLocaleString()}
                {dropRate !== null && dropRate > 0 && (
                  <span className="ml-2 text-danger">-{dropRate}%</span>
                )}
              </span>
            </div>
            <div className="h-9 rounded-md bg-white/5">
              <div
                className="flex h-full items-center justify-end rounded-md bg-gradient-to-r from-lime/40 to-lime px-3 text-xs font-semibold text-ink transition-all"
                style={{ width: `${width}%` }}
              >
                {width > 15 && stage.count}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
