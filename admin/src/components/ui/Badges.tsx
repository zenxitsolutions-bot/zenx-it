import type { EnquiryStatus, LeadPriority, AdminStatus, ApplicationAccessStatus, CompanyStatus } from "../../types/domain";
import { STATUS_LABELS } from "../../types/domain";
import { cn } from "../../utils/cn";

/**
 * Status colors, per the design system:
 *   New → blue · Contacted → purple · Follow-up → orange · Converted → green · Lost → red
 *
 * Each badge is a soft tint of its hue with a darker shade of the *same* hue for the label. The
 * pure status colors (#3478D8 / #7C5CE1 / #F59E42 / #22A06B / #E85D5D) are the right values for
 * dots, chart series and solid fills, but as small text on a light tint they range from marginal
 * to unreadable — the orange lands at 2.13:1 against white. The label shades below are the same
 * hues darkened until they clear 4.5:1 on their own tint, so the badge keeps its identity and
 * stays legible. `bg-*`/dot usages elsewhere continue to use the pure values.
 */
const STATUS_STYLES: Record<EnquiryStatus, string> = {
  NEW: "bg-tintBlue text-[#2563B8]",
  CONTACTED: "bg-tintPurple text-[#5B3FC4]",
  FOLLOW_UP: "bg-tintOrange text-[#A35700]",
  CONVERTED: "bg-tintGreen text-[#157A4E]",
  LOST: "bg-tintRed text-[#B93232]",
};

const BADGE_BASE =
  "inline-flex items-center rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider";

export function StatusBadge({ status, className }: { status: EnquiryStatus; className?: string }) {
  return <span className={cn(BADGE_BASE, STATUS_STYLES[status], className)}>{STATUS_LABELS[status]}</span>;
}

/* Priority escalates through the same hue family as the statuses so the two badge sets read as one
   system: neutral → blue → orange → red. */
const PRIORITY_STYLES: Record<LeadPriority, string> = {
  LOW: "bg-surface text-muted",
  MEDIUM: "bg-tintBlue text-[#2563B8]",
  HIGH: "bg-tintOrange text-[#A35700]",
  HOT: "bg-tintRed text-[#B93232]",
};

export function PriorityBadge({ priority, className }: { priority: LeadPriority; className?: string }) {
  return <span className={cn(BADGE_BASE, PRIORITY_STYLES[priority], className)}>{priority}</span>;
}

export function AccountStatusBadge({ status }: { status: AdminStatus | ApplicationAccessStatus | CompanyStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={cn(
        BADGE_BASE,
        "gap-1.5",
        active ? "bg-tintGreen text-[#157A4E]" : "bg-surface text-muted"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-ok" : "bg-dim")} />
      {status}
    </span>
  );
}
