import { useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";
import { STATUS_LABELS, type EnquiryStatus } from "../../types/domain";

interface PipelineColumnProps {
  status: EnquiryStatus;
  count: number;
  children: ReactNode;
  onDropLead: (id: string, status: EnquiryStatus) => void;
}

export function PipelineColumn({ status, count, children, onDropLead }: PipelineColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "flex w-[300px] shrink-0 flex-col rounded-xl2 border bg-panel/40 transition",
        dragOver ? "border-lime/50 bg-lime/[0.04]" : "border-border"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDropLead(id, status);
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">
          {STATUS_LABELS[status]}
        </span>
        <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] text-dim">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3">{children}</div>
    </div>
  );
}
