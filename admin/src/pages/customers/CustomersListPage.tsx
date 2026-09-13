import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Users, Plus, LayoutGrid, List, Pencil, Building2 } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { companiesService } from "../../services/companies";
import { applicationsService } from "../../services/applications";
import { Input, Select } from "../../components/ui/Field";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AccountStatusBadge } from "../../components/ui/Badges";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader, MetaChip } from "../../components/ui/PageHeader";
import { TableWrap, THead, TH, TR, TD } from "../../components/ui/Table";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { AddCustomerModal } from "../../components/customers/AddCustomerModal";
import { EditCustomerModal } from "../../components/customers/EditCustomerModal";
import { formatDate } from "../../utils/date";
import { cn } from "../../utils/cn";
import type { Company, ZenxUser } from "../../types/domain";

export default function CustomersListPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  // Seeded from ?app= so the Applications page's "Customers" button lands on a filtered list
  // rather than dropping the user into every customer.
  const [appFilter, setAppFilter] = useState(searchParams.get("app") ?? "ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");
  const [view, setView] = useState<"cards" | "list">("list");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<{ company: Company; contact: ZenxUser | null } | null>(null);

  const { data: companies, loading, refresh } = useLiveQuery(() => companiesService.list(), [], {
    tables: ["companies"],
  });
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

  const appBySlug = useMemo(() => new Map((applications ?? []).map((a) => [a.slug, a])), [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (companies ?? []).filter((c) => {
      if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
      if (appFilter !== "ALL") {
        const has = (allAccess ?? []).some(
          (a) => a.company_id === c.id && a.application === appFilter && a.status === "ACTIVE"
        );
        if (!has) return false;
      }
      if (!q) return true;
      const contact = primaryContacts?.get(c.id);
      const contactText = contact ? `${contact.first_name} ${contact.last_name} ${contact.email}` : "";
      return `${c.company_name} ${c.company_email ?? ""} ${contactText}`.toLowerCase().includes(q);
    });
  }, [companies, search, statusFilter, appFilter, allAccess, primaryContacts]);

  const reload = () => {
    refresh();
    refreshContacts();
  };

  if (loading || !companies) return <SkeletonRows rows={5} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="Companies with a provisioned account. Created when an enquiry is converted."
        meta={<MetaChip>{filtered.length} of {companies.length} customers</MetaChip>}
        actions={
          <>
            <div className="flex shrink-0 gap-1 rounded-lg bg-surface p-1">
              {(
                [
                  { id: "list", icon: List, label: "List view" },
                  { id: "cards", icon: LayoutGrid, label: "Card view" },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  aria-label={v.label}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 transition",
                    view === v.id ? "bg-panel text-offwhite shadow-sm" : "text-dim hover:text-offwhite"
                  )}
                >
                  <v.icon size={15} />
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus size={14} /> Add Customer
            </Button>
          </>
        }
      />

      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, contact or email…"
            className="pl-9"
            aria-label="Search customers"
          />
        </div>
        <Select
          value={appFilter}
          onChange={(e) => setAppFilter(e.target.value)}
          className="w-auto min-w-[170px]"
          aria-label="Filter by application"
        >
          <option value="ALL">All applications</option>
          {(applications ?? []).map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "DISABLED")}
          className="w-auto min-w-[150px]"
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </Select>
      </Card>

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
          title={companies.length === 0 ? "No customers yet" : "No customers match those filters"}
          description={
            companies.length === 0
              ? "Customers appear here once a lead is converted and an application account is created."
              : "Try a different search term, application or status."
          }
        />
      ) : view === "list" ? (
        <Card className="overflow-hidden">
          <TableWrap className="min-w-full">
            <THead>
              <TH className="pl-5">Company</TH>
              <TH>Contact</TH>
              <TH>Applications</TH>
              <TH>Status</TH>
              <TH>Customer since</TH>
              <TH className="pr-5 text-right">Actions</TH>
            </THead>
            <tbody>
              {filtered.map((c) => {
                const access = (allAccess ?? []).filter((a) => a.company_id === c.id && a.status === "ACTIVE");
                const contact = primaryContacts?.get(c.id) ?? null;
                return (
                  <TR key={c.id}>
                    <TD className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime/10 text-lime">
                          <Building2 size={16} />
                        </span>
                        <Link
                          to={`/admin/customers/${c.id}`}
                          className="font-semibold text-offwhite hover:text-lime"
                        >
                          {c.company_name}
                        </Link>
                      </div>
                    </TD>
                    <TD>
                      <p className="text-muted">
                        {contact ? `${contact.first_name} ${contact.last_name}` : "—"}
                      </p>
                      <p className="text-[11px] text-dim">{contact?.email ?? c.company_email ?? "—"}</p>
                    </TD>
                    <TD>
                      {access.length === 0 ? (
                        <span className="text-xs text-dim">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {access.map((a) => (
                            <span
                              key={a.id}
                              className="rounded-pill bg-lime/10 px-2 py-0.5 text-[10px] font-medium text-lime"
                            >
                              {appBySlug.get(a.application)?.name ?? "Application"}
                            </span>
                          ))}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <AccountStatusBadge status={c.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-dim">{formatDate(c.created_at)}</TD>
                    <TD className="pr-5 text-right">
                      <Button size="sm" variant="secondary" onClick={() => setEditing({ company: c, contact })}>
                        <Pencil size={13} /> Edit
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </TableWrap>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const access = (allAccess ?? []).filter((a) => a.company_id === c.id && a.status === "ACTIVE");
            const contact = primaryContacts?.get(c.id) ?? null;
            return (
              <Card key={c.id} interactive className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl2 bg-lime/10 text-lime">
                    <Building2 size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/admin/customers/${c.id}`}
                      className="block truncate font-display text-base text-offwhite hover:text-lime"
                    >
                      {c.company_name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                      {contact ? `${contact.first_name} ${contact.last_name}` : "No contact yet"}
                    </p>
                  </div>
                  <AccountStatusBadge status={c.status} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {access.length === 0 ? (
                    <span className="text-xs text-dim">No application access</span>
                  ) : (
                    access.map((a) => (
                      <span
                        key={a.id}
                        className="rounded-pill bg-lime/10 px-2.5 py-1 text-[10px] font-medium text-lime"
                      >
                        {appBySlug.get(a.application)?.name ?? "Application"}
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                  <p className="text-xs text-dim">Since {formatDate(c.created_at)}</p>
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
