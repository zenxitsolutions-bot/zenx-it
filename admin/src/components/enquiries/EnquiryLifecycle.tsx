import { FilePlus2, PhoneCall, CalendarPlus, CalendarCheck, Trophy, XCircle, Circle } from "lucide-react";
import { formatDateTime } from "../../utils/date";
import { cn } from "../../utils/cn";
import type { Enquiry, Followup, Interaction } from "../../types/domain";

interface Step {
  key: string;
  label: string;
  icon: typeof FilePlus2;
  /** ISO timestamp when this actually happened, or null if it hasn't. */
  at: string | null;
  tone?: "default" | "won" | "lost";
  hint?: string;
}

/**
 * The enquiry's real lifecycle, each stage stamped with when it actually happened rather than
 * inferred from the current status alone. Every timestamp is read off an existing record —
 * the enquiry row, its interactions, and its follow-ups — so a stage can only show as reached if
 * there is a row proving it.
 *
 * This complements PipelineStepper rather than replacing it: that shows where the lead sits *now*
 * (and is what the status control drives), this shows how it got there.
 */
export function EnquiryLifecycle({
  enquiry,
  interactions,
  followups,
}: {
  enquiry: Enquiry;
  interactions: Interaction[];
  followups: Followup[];
}) {
  const earliest = (xs: string[]) =>
    xs.length ? xs.slice().sort((a, b) => +new Date(a) - +new Date(b))[0] : null;

  const mine = interactions.filter((i) => i.enquiry_id === enquiry.id);
  const myFollowups = followups.filter((f) => f.enquiry_id === enquiry.id);

  const firstContact = earliest(mine.map((i) => i.created_at));
  const firstScheduled = earliest(myFollowups.map((f) => f.created_at));
  const firstCompleted = earliest(
    myFollowups.filter((f) => f.status === "COMPLETED" && f.completed_at).map((f) => f.completed_at as string)
  );

  const steps: Step[] = [
    { key: "created", label: "Enquiry created", icon: FilePlus2, at: enquiry.created_at },
    {
      key: "contacted",
      label: "Contacted",
      icon: PhoneCall,
      at: firstContact,
      hint: mine.length > 1 ? `${mine.length} interactions logged` : undefined,
    },
    { key: "scheduled", label: "Follow-up scheduled", icon: CalendarPlus, at: firstScheduled },
    { key: "completed", label: "Follow-up completed", icon: CalendarCheck, at: firstCompleted },
  ];

  // The outcome step is one row that is either Converted or Lost — never both, and never a generic
  // "Converted / Lost" placeholder once the answer is known.
  if (enquiry.status === "LOST") {
    steps.push({ key: "outcome", label: "Lost", icon: XCircle, at: enquiry.lost_at, tone: "lost" });
  } else {
    steps.push({ key: "outcome", label: "Converted", icon: Trophy, at: enquiry.converted_at, tone: "won" });
  }

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const done = Boolean(step.at);
        const last = i === steps.length - 1;
        const Icon = done ? step.icon : Circle;

        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border transition",
                  !done && "border-dashed border-borderStrong bg-surface text-dim",
                  done && step.tone === "won" && "border-transparent bg-ok/12 text-okInk",
                  done && step.tone === "lost" && "border-transparent bg-danger/12 text-dangerInk",
                  done && !step.tone && "border-transparent bg-lime/12 text-lime"
                )}
              >
                <Icon size={14} />
              </span>
              {!last && (
                <span
                  className={cn("my-1 w-px flex-1", done ? "bg-lime/40" : "bg-border")}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className={cn("min-w-0 flex-1", last ? "pb-0" : "pb-4")}>
              <p className={cn("text-sm font-medium", done ? "text-offwhite" : "text-dim")}>{step.label}</p>
              <p className="mt-0.5 text-xs text-dim">
                {step.at ? formatDateTime(step.at) : "Not yet"}
                {step.hint && done && <span className="text-muted"> · {step.hint}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
