import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Plus, LayoutGrid, List, Pencil } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { companiesService } from "../../services/companies";
import { applicationsService } from "../../services/applications";
import { Input } from "../../components/ui/Field";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AccountStatusBadge } from "../../components/ui/Badges";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { AddCustomerModal } from "../../components/customers/AddCustomerModal";
import { EditCustomerModal } from "../../components/customers/EditCustomerModal";
import { formatDate } from "../../utils/date";
import type { Company, ZenxUser } from "../../types/domain";

export default function CustomersListPage() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"cards" | "list">("list");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<{ company: Company; contact: ZenxUser | null } | null>(null);
  const { data: companies, loading, refresh } = useLiveQuery(() => companiesService.list(), [], { tables: ["companies"] });
  const { data: applications } = useLiveQuery(() => applicationsService.list(), []);
  const { data: allAccess } = useLiveQuery(
    async () => {
      const list = await companiesService.list();
      const results = await Promise.all(list.map((c) => companiesService.listApplicationAccess(c.id)));
      return results.flat();
    },
    [],
    { tables: ["application_access"] }
  );
  // Primary contact per company, for search + the card subtitle — a company can in principle have
  // several people with access, so this is "the first one found," matching this card's single-line
  // display; CustomerDetailPage lists everyone.
  const { data: primaryContacts, refresh: refreshContacts } = useLiveQuery(
    async () => {
      const list = await companiesService.list();
      const results = await Promise.all(list.map((c) => companiesService.listUsersForCompany(c.id)));
      const byCompany = new Map<string, ZenxUser | null>();
      list.forEach((c, i) => byCompany.set(c.id, results[i][0]?.user ?? null));
      return byCompany;
    },
    [],
    { tables: ["application_access", "users"] }
  );

  const appBySlug = new Map((applications ?? []).map((a) => [a.slug, a]));

  const filtered = (companies ?? []).filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const contact = primaryContacts?.get(c.id);
    const contactText = contact ? `${contact.first_name} ${contact.last_name} ${contact.email}` : "";
    return `${c.company_name} ${c.company_email ?? ""} ${contactText}`.toLowerCase().includes(q);
  });

  const reload = () => {
    refresh();
    refreshContacts();
  };

  if (loading || !companies) return <SkeletonRows rows={5} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 gap-1 rounded-md border border-border p-1">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={`rounded px-2.5 py-1.5 transition ${view === "cards" ? "bg-lime/10 text-lime" : "text-dim hover:text-offwhite"}`}
              aria-label="Card view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded px-2.5 py-1.5 transition ${view === "list" ? "bg-lime/10 text-lime" : "text-dim hover:text-offwhite"}`}
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add Customer
          </Button>
        </div>
      </div>

      <AddCustomerModal
        open={addOpen}
        onClose={(created) => {
          setAddOpen(false);
          if (created) reload();
        }}
      />
      <EditCustomerModal
        open={!!editing}
        company={editing?.company ?? null}
        contact={editing?.contact ?? null}
        onClose={(saved) => {
          setEditing(null);
          if (saved) reload();
        }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers appear here once a lead is converted and an application account is created."
        />
      ) : view === "list" ? (
        <div className="overflow-x-auto rounded-xl2 border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-panel text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Applications</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Customer since</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const access = (allAccess ?? []).filter((a) => a.company_id === c.id && a.status === "ACTIVE");
                const contact = primaryContacts?.get(c.id) ?? null;
                return (
                  <tr key={c.id} className="border-t border-border transition hover:bg-ink">
                    <td className="px-4 py-3">
                      <Link to={`/admin/customers/${c.id}`} className="font-semibold text-offwhite hover:text-lime">
                        {c.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {contact ? `${contact.first_name} ${contact.last_name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{contact?.email ?? c.company_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      {access.length === 0 ? (
                        <span className="text-xs text-dim">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {access.map((a) => (
                            <span
                              key={a.id}
                              className="rounded-full border border-lime/30 bg-lime/5 px-2 py-0.5 text-[10px] text-lime"
                            >
                              {appBySlug.get(a.application)?.name ?? "Application"}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AccountStatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-dim">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditing({ company: c, contact })}
                      >
                        <Pencil size={13} /> Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const access = (allAccess ?? []).filter((a) => a.company_id === c.id);
            const contact = primaryContacts?.get(c.id) ?? null;
            return (
              <Card key={c.id} className="flex h-full flex-col gap-4 p-5 transition hover:border-lime/40">
                <Link to={`/admin/customers/${c.id}`} className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg text-offwhite">{c.company_name}</p>
                    <p className="text-xs text-muted">
                      {contact ? `${contact.first_name} ${contact.last_name}` : "No contact yet"}
                    </p>
                  </div>
                  <AccountStatusBadge status={c.status} />
                </Link>
                <div className="flex flex-wrap gap-1.5">
                  {access.filter((a) => a.status === "ACTIVE").length === 0 && (
                    <span className="text-xs text-dim">No application access</span>
                  )}
                  {access
                    .filter((a) => a.status === "ACTIVE")
                    .map((a) => (
                      <span
                        key={a.id}
                        className="rounded-full border border-lime/30 bg-lime/5 px-2.5 py-1 text-[10px] text-lime"
                      >
                        {appBySlug.get(a.application)?.name ?? "Application"}
                      </span>
                    ))}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <p className="text-xs text-dim">Customer since {formatDate(c.created_at)}</p>
                  <Button size="sm" variant="secondary" onClick={() => setEditing({ company: c, contact })}>
                    <Pencil size={13} /> Edit
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
