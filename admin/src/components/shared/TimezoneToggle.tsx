export type TimezoneViewMode = "mine" | "theirs" | "company";

interface TimezoneToggleProps {
  mode: TimezoneViewMode;
  onChange: (mode: TimezoneViewMode) => void;
  // Disable options that don't resolve to a real zone right now (e.g. no company timezone set, or
  // viewing your own items so "theirs" is meaningless) rather than hiding them — a stable 3-way
  // control is easier to scan than one whose options shuffle around.
  theirsAvailable?: boolean;
  companyAvailable?: boolean;
}

const OPTIONS: { mode: TimezoneViewMode; label: string }[] = [
  { mode: "mine", label: "My timezone" },
  { mode: "theirs", label: "Their timezone" },
  { mode: "company", label: "Company timezone" },
];

// Spec item 17 — when viewing another person's schedule, let the admin pick which zone times
// render in. A small 3-way segmented control; the caller resolves `mode` into an actual IANA zone
// string and threads it into formatDate/formatTime's timeZone argument.
export function TimezoneToggle({ mode, onChange, theirsAvailable = true, companyAvailable = true }: TimezoneToggleProps) {
  const disabled: Record<TimezoneViewMode, boolean> = { mine: false, theirs: !theirsAvailable, company: !companyAvailable };
  return (
    <div className="inline-flex rounded-md border border-border bg-ink p-0.5 text-xs">
      {OPTIONS.map((opt) => (
        <button
          key={opt.mode}
          type="button"
          disabled={disabled[opt.mode]}
          onClick={() => onChange(opt.mode)}
          className={`rounded px-2.5 py-1.5 transition ${
            mode === opt.mode ? "bg-lime text-ink" : disabled[opt.mode] ? "cursor-not-allowed text-dim/50" : "text-muted hover:text-offwhite"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
