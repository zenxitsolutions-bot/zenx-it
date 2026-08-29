import type { EnquiryStatus, LeadPriority, AdminStatus, ApplicationAccessStatus, CompanyStatus } from "../../types/domain";
import { STATUS_LABELS } from "../../types/domain";
import { cn } from "../../utils/cn";

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  NEW: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  CONTACTED: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  FOLLOW_UP: "bg-violet-400/10 text-violet-300 border-violet-400/30",
  CONVERTED: "bg-lime/10 text-lime border-lime/40",
  LOST: "bg-danger/10 text-danger border-danger/30",
};

export function StatusBadge({ status, className }: { status: EnquiryStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        STATUS_STYLES[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  LOW: "bg-white/5 text-muted border-border",
  MEDIUM: "bg-sky-400/10 text-sky-300 border-sky-400/30",
  HIGH: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  HOT: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

export function PriorityBadge({ priority, className }: { priority: LeadPriority; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        PRIORITY_STYLES[priority],
        className
      )}
    >
      {priority}
    </span>
  );
}

export function AccountStatusBadge({ status }: { status: AdminStatus | ApplicationAccessStatus | CompanyStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
        active ? "bg-lime/10 text-lime border-lime/40" : "bg-white/5 text-dim border-border"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-lime" : "bg-dim")} />
      {status}
    </span>
  );
}
