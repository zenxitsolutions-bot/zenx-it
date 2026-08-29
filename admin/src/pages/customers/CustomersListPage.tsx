import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Plus } from "lucide-react";
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
import { formatDate } from "../../utils/date";

export default function CustomersListPage() {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
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
  const { data: primaryContacts } = useLiveQuery(
    async () => {
      const list = await companiesService.list();
      const results = await Promise.all(list.map((c) => companiesService.listUsersForCompany(c.id)));
      const byCompany = new Map<string, { first_name: string; last_name: string; email: string } | null>();
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
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus size={14} /> Add Customer
        </Button>
      </div>

      <AddCustomerModal
        open={addOpen}
        onClose={(created) => {
          setAddOpen(false);
          if (created) refresh();
        }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers yet"
          description="Customers appear here once a lead is converted and an application account is created."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const access = (allAccess ?? []).filter((a) => a.company_id === c.id);
            const contact = primaryContacts?.get(c.id);
            return (
              <Link key={c.id} to={`/admin/customers/${c.id}`}>
                <Card className="flex h-full flex-col gap-4 p-5 transition hover:border-lime/40">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-lg text-offwhite">{c.company_name}</p>
                      <p className="text-xs text-muted">
                        {contact ? `${contact.first_name} ${contact.last_name}` : "No contact yet"}
                      </p>
                    </div>
                    <AccountStatusBadge status={c.status} />
                  </div>
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
                  <p className="mt-auto text-xs text-dim">Customer since {formatDate(c.created_at)}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
