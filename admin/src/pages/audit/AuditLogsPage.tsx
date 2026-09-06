import { useMemo, useState } from "react";
import { Search, ScrollText } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { auditService } from "../../services/auditLogs";
import { adminUsersService } from "../../services/adminUsers";
import { Card } from "../../components/ui/Card";
import { PageHeader, MetaChip } from "../../components/ui/PageHeader";
import { TableWrap, THead, TH, TR, TD } from "../../components/ui/Table";
import { Input, Select } from "../../components/ui/Field";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/date";

export default function AuditLogsPage() {
  const { data, loading } = useLiveQuery(
    async () => {
      const [logs, admins] = await Promise.all([auditService.list(), adminUsersService.list()]);
      return { logs, admins };
    },
    [],
    { tables: ["audit_logs"] }
  );

  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("ALL");

  // Entity types are whatever the server has written, not a fixed enum — derive the filter options
  // from the data so a new entity type appears here without a frontend change.
  const entityTypes = useMemo(
    () => Array.from(new Set((data?.logs ?? []).map((l) => l.entity_type))).sort(),
    [data]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.logs ?? []).filter((l) => {
      if (entity !== "ALL" && l.entity_type !== entity) return false;
      if (!q) return true;
      return `${l.action} ${l.entity_type} ${l.description}`.toLowerCase().includes(q);
    });
  }, [data, search, entity]);

  const nameFor = (adminId: string) => {
    const a = (data?.admins ?? []).find((x) => x.id === adminId);
    return a ? `${a.first_name} ${a.last_name}` : "—";
  };

  if (loading || !data) return <SkeletonRows rows={8} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Platform actions taken by ZenX staff — company creates, status changes, access grants."
        meta={<MetaChip>{filtered.length} of {data.logs.length} entries</MetaChip>}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions and descriptions…"
              className="pl-9"
              aria-label="Search audit logs"
            />
          </div>
          <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-auto min-w-[160px]">
            <option value="ALL">All entities</option>
            {entityTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={data.logs.length === 0 ? "No audit entries yet" : "No entries match those filters"}
            description={
              data.logs.length === 0
                ? "Staff actions across the platform will appear here."
                : "Try a different search term or entity type."
            }
            className="m-4 border-0 bg-transparent"
          />
        ) : (
          <TableWrap>
            <THead>
              <TH className="pl-5">When</TH>
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>By</TH>
              <TH className="pr-5">Description</TH>
            </THead>
            <tbody>
              {filtered.map((log) => (
                <TR key={log.id}>
                  <TD className="whitespace-nowrap pl-5 text-xs text-muted">{formatDate(log.created_at)}</TD>
                  <TD>
                    <span className="rounded-pill bg-lime/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-lime">
                      {log.action}
                    </span>
                  </TD>
                  <TD className="text-muted">
                    {log.entity_type}
                    <span className="ml-1 font-mono text-[11px] text-dim">{log.entity_id.slice(0, 8)}</span>
                  </TD>
                  <TD className="whitespace-nowrap text-xs text-muted">{nameFor(log.admin_id)}</TD>
                  <TD className="pr-5 text-offwhite">{log.description}</TD>
                </TR>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </div>
  );
}
