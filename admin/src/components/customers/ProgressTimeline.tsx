import { Check } from "lucide-react";
import { formatDate } from "../../utils/date";
import { cn } from "../../utils/cn";

interface ProgressStep {
  label: string;
  date: string | null;
}

export function ProgressTimeline({ steps }: { steps: ProgressStep[] }) {
  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => {
        const done = Boolean(step.date);
        return (
          <div key={step.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                  done ? "border-lime bg-lime text-ink" : "border-border text-dim"
                )}
              >
                {done && <Check size={13} />}
              </span>
              {idx < steps.length - 1 && (
                <span className={cn("w-px flex-1 min-h-[24px]", done ? "bg-lime" : "bg-border")} />
              )}
            </div>
            <div className="pb-6">
              <p className={cn("text-sm font-semibold", done ? "text-offwhite" : "text-dim")}>{step.label}</p>
              <p className="text-xs text-dim">{step.date ? formatDate(step.date) : "Not yet reached"}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
