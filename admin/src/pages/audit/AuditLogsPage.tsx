import { useLiveQuery } from "../../hooks/useLiveQuery";
import { auditService } from "../../services/auditLogs";
import { Card } from "../../components/ui/Card";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/date";

export default function AuditLogsPage() {
  const { data: logs, loading } = useLiveQuery(() => auditService.list(), [], { tables: ["audit_logs"] });

  if (loading || !logs) return <SkeletonRows rows={8} />;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">Platform actions taken by ZenX staff — company creates, status changes, access grants.</p>
      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">When</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Entity</th>
              <th className="px-5 py-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  No audit entries yet.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-border">
                <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(log.created_at)}</td>
                <td className="px-5 py-3 font-mono text-xs text-lime">{log.action}</td>
                <td className="px-5 py-3 text-muted">
                  {log.entity_type}
                  <span className="ml-1 font-mono text-[11px] text-dim">{log.entity_id.slice(0, 8)}</span>
                </td>
                <td className="px-5 py-3 text-offwhite">{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
