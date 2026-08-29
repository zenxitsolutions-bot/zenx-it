import { STATUS_LABELS, type EnquiryStatus } from "../../types/domain";
import { cn } from "../../utils/cn";

const STEPS: EnquiryStatus[] = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED"];

export function PipelineStepper({ status }: { status: EnquiryStatus }) {
  if (status === "LOST") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        This enquiry was marked as Lost.
      </div>
    );
  }

  const currentIdx = STEPS.indexOf(status);

  return (
    <div className="flex items-center">
      {STEPS.map((step, idx) => {
        const reached = idx <= currentIdx;
        return (
          <div key={step} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "h-3 w-3 rounded-full border-2 transition",
                  reached ? "border-lime bg-lime" : "border-border bg-transparent",
                  idx === currentIdx && "animate-pulseGlow"
                )}
              />
              <span className={cn("text-[10px] uppercase tracking-wider", reached ? "text-lime" : "text-dim")}>
                {STATUS_LABELS[step]}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <span className={cn("mx-2 h-px flex-1", idx < currentIdx ? "bg-lime" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
