import { Search, LayoutGrid, List } from "lucide-react";
import { Input, Select } from "../ui/Field";
import { ENQUIRY_STATUSES, LEAD_SOURCES, SERVICE_OPTIONS, STATUS_LABELS } from "../../types/domain";
import type { EnquiryStatus, LeadSource, Profile, ServiceOption } from "../../types/domain";

export type SortOption = "newest" | "oldest" | "priority" | "followup";

export interface EnquiryFilterState {
  search: string;
  status: EnquiryStatus | "ALL";
  service: ServiceOption | "ALL";
  source: LeadSource | "ALL";
  assignedTo: string | "ALL";
  sort: SortOption;
}

interface EnquiryFiltersProps {
  value: EnquiryFilterState;
  onChange: (next: EnquiryFilterState) => void;
  admins: Profile[];
  view: "pipeline" | "table";
  onViewChange: (v: "pipeline" | "table") => void;
}

export function EnquiryFilters({ value, onChange, admins, view, onViewChange }: EnquiryFiltersProps) {
  const set = <K extends keyof EnquiryFilterState>(key: K, v: EnquiryFilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="flex flex-col gap-3 rounded-xl2 border border-border bg-panel/50 p-3.5 lg:flex-row lg:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <Input
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search company, contact, phone or email…"
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
        <Select value={value.status} onChange={(e) => set("status", e.target.value as EnquiryFilterState["status"])}>
          <option value="ALL">All statuses</option>
          {ENQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>

        <Select value={value.service} onChange={(e) => set("service", e.target.value as EnquiryFilterState["service"])}>
          <option value="ALL">All services</option>
          {SERVICE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select value={value.source} onChange={(e) => set("source", e.target.value as EnquiryFilterState["source"])}>
          <option value="ALL">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select value={value.assignedTo} onChange={(e) => set("assignedTo", e.target.value)}>
          <option value="ALL">All admins</option>
          {admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.first_name} {a.last_name}
            </option>
          ))}
        </Select>
      </div>

      <Select value={value.sort} onChange={(e) => set("sort", e.target.value as SortOption)} className="lg:w-44">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="priority">Highest priority</option>
        <option value="followup">Follow-up date</option>
      </Select>

      <div className="flex shrink-0 gap-1 rounded-md border border-border p-1">
        <button
          onClick={() => onViewChange("pipeline")}
          className={`rounded px-2.5 py-1.5 transition ${view === "pipeline" ? "bg-lime/10 text-lime" : "text-dim hover:text-offwhite"}`}
          aria-label="Pipeline view"
        >
          <LayoutGrid size={15} />
        </button>
        <button
          onClick={() => onViewChange("table")}
          className={`rounded px-2.5 py-1.5 transition ${view === "table" ? "bg-lime/10 text-lime" : "text-dim hover:text-offwhite"}`}
          aria-label="Table view"
        >
          <List size={15} />
        </button>
      </div>
    </div>
  );
}
