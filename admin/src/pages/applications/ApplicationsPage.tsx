import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutGrid,
  ShieldOff,
  ShieldCheck,
  Pencil,
  Check,
  X,
  Users,
  ExternalLink,
  Globe,
} from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { applicationsService } from "../../services/applications";
import { companiesService } from "../../services/companies";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { Card, CardHeader } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { AccountStatusBadge } from "../../components/ui/Badges";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/date";

export default function ApplicationsPage() {
  const { profile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  const { data: applications, loading, refresh: refreshApplications } = useLiveQuery(
    () => applicationsService.list(),
    []
  );
  const { data: companies } = useLiveQuery(() => companiesService.list(), [], { tables: ["companies"] });
  const { data: grants, refresh: refreshGrants } = useLiveQuery(
    async () => {
      const list = await companiesService.list();
      const results = await Promise.all(list.map((c) => companiesService.listApplicationAccess(c.id)));
      return results.flat();
    },
    [],
    { tables: ["application_access"] }
  );

  if (loading || !applications) return <SkeletonRows rows={4} />;

  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));

  const handleToggle = async (accessId: string, current: "ACTIVE" | "DISABLED", appName: string, companyName: string) => {
    const activating = current === "DISABLED";
    const ok = await confirm({
      title: activating ? `Activate ${appName} for ${companyName}?` : `Disable ${appName} access for ${companyName}?`,
      danger: !activating,
      confirmLabel: activating ? "Activate" : "Disable Access",
    });
    if (!ok || !profile) return;
    await companiesService.setApplicationAccess(accessId, activating ? "ACTIVE" : "DISABLED", profile.id);
    toast(activating ? "Application access activated" : "Application access disabled");
    refreshGrants();
  };

  const handleSaveUrl = async (id: string) => {
    setSavingUrl(true);
    try {
      await applicationsService.updateUrl(id, urlDraft.trim());
      toast("Application URL updated");
      setEditingId(null);
      refreshApplications();
    } finally {
      setSavingUrl(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader description="Products ZenX provisions for customers, and who currently has access to each." />

      <div className="grid gap-4 md:grid-cols-2">
        {applications.map((app) => {
          const appGrants = (grants ?? []).filter((g) => g.application === app.slug);
          const active = appGrants.filter((g) => g.status === "ACTIVE").length;
          const deployed = Boolean(app.url);
          const editing = editingId === app.id;

          return (
            <Card key={app.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl2 bg-lime/10 text-lime">
                  <LayoutGrid size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg text-offwhite">{app.name}</h3>
                    {/* "Deployed" is a real property of the record (does it have a URL), not an
                        invented lifecycle state. */}
                    <span
                      className={
                        deployed
                          ? "rounded-pill bg-ok/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-okInk"
                          : "rounded-pill bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-dim"
                      }
                    >
                      {deployed ? "Live" : "Not deployed"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{app.description}</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2 rounded-lg bg-surface px-3.5 py-2.5">
                <span className="font-display text-2xl leading-none text-offwhite">{active}</span>
                <span className="text-xs text-muted">
                  active customer{active === 1 ? "" : "s"}
                  {appGrants.length !== active && (
                    <span className="text-dim"> · {appGrants.length - active} disabled</span>
                  )}
                </span>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Deployment URL
                </p>
                {editing ? (
                  <div className="flex gap-2">
                    <Input
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      placeholder="https://your-domain.com"
                      className="font-mono text-xs"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleSaveUrl(app.id)} disabled={savingUrl} aria-label="Save URL">
                      <Check size={13} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)} aria-label="Cancel">
                      <X size={13} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Globe size={13} className="shrink-0 text-dim" />
                    <code className="min-w-0 flex-1 truncate text-xs text-dim">
                      {app.url ? `${app.url}/{company-slug}` : "Not deployed yet"}
                    </code>
                  </div>
                )}
              </div>

              {!editing && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {app.url && (
                    <a href={app.url} target="_blank" rel="noreferrer noopener">
                      <Button size="sm" variant="secondary">
                        <ExternalLink size={13} /> View
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(app.id);
                      setUrlDraft(app.url ?? "");
                    }}
                  >
                    <Pencil size={13} /> Manage
                  </Button>
                  <Link to={`/admin/customers?app=${app.slug}`}>
                    <Button size="sm" variant="secondary">
                      <Users size={13} /> Customers
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="p-5">
        <CardHeader
          title="Application access"
          subtitle="Every grant across all customers"
          className="mb-4"
        />
        {(grants ?? []).length === 0 ? (
          <EmptyState
            title="No application accounts yet"
            description="Grants appear here once a lead is converted with application access."
            className="border-0 bg-transparent"
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(grants ?? []).map((g) => {
              const company = companyById.get(g.company_id);
              const app = applications.find((a) => a.slug === g.application);
              if (!company || !app) return null;
              return (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 transition hover:border-borderStrong hover:bg-surface/60"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/admin/customers/${company.id}`}
                      className="text-sm font-semibold text-offwhite hover:text-lime"
                    >
                      {company.company_name}
                    </Link>
                    <p className="text-xs text-dim">
                      {app.name} · granted {formatDate(g.activated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <AccountStatusBadge status={g.status} />
                    <Button
                      size="sm"
                      variant={g.status === "ACTIVE" ? "danger" : "secondary"}
                      onClick={() => handleToggle(g.id, g.status, app.name, company.company_name)}
                    >
                      {g.status === "ACTIVE" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      {g.status === "ACTIVE" ? "Disable" : "Activate"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
