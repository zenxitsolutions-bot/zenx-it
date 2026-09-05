import { formatDate } from '@/lib/format';
import { PROGRESS_MEASUREMENTS } from '@/lib/clientPortal';

// Append-only: no edit/delete affordance here by design — a record is a fact about a date that
// already passed, so the only way to "fix" one is to log a new entry, not rewrite history.
export function ProgressHistoryTable({ entries }) {
  const rows = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <th className="py-2 pr-4">Date</th>
            {PROGRESS_MEASUREMENTS.map((m) => (
              <th key={m.key} className="py-2 pr-4">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => (
            <tr key={entry._id} className="border-b border-line/60 last:border-0">
              <td className="py-2 pr-4 font-medium text-forest">{formatDate(entry.date)}</td>
              {PROGRESS_MEASUREMENTS.map((m) => (
                <td key={m.key} className="py-2 pr-4 text-muted-foreground">
                  {entry[m.key] != null ? `${entry[m.key]} ${m.unit}` : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
