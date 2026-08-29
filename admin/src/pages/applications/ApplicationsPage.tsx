import { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, ShieldOff, ShieldCheck, Pencil, Check, X } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { applicationsService } from "../../services/applications";
import { companiesService } from "../../services/companies";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Field";
import { AccountStatusBadge } from "../../components/ui/Badges";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { formatDate } from "../../utils/date";

export default function ApplicationsPage() {
  const { profile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  const { data: applications, loading, refresh: refreshApplications } = useLiveQuery(() => applicationsService.list(), []);
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
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {applications.map((app) => {
          const appGrants = (grants ?? []).filter((g) => g.application === app.slug);
          const active = appGrants.filter((g) => g.status === "ACTIVE").length;
          return (
            <Card key={app.id} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl text-offwhite">{app.name}</h3>
                  <p className="mt-1 text-sm text-muted">{app.description}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime/10 text-lime">
                  <LayoutGrid size={18} />
                </span>
              </div>
              <p className="mt-4 text-sm text-dim">
                <span className="font-display text-2xl text-offwhite">{active}</span> active account{active === 1 ? "" : "s"}
              </p>

              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Deployment URL
                </p>
                {editingId === app.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      placeholder="https://your-domain.com"
                      className="font-mono text-xs"
                      autoFocus
                    />
                    <Button size="sm" onClick={() => handleSaveUrl(app.id)} disabled={savingUrl}>
                      <Check size={13} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                      <X size={13} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <code className="truncate text-xs text-dim">
                      {app.url ? `${app.url}/{company-slug}` : "Not deployed yet"}
                    </code>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(app.id);
                        setUrlDraft(app.url ?? "");
                      }}
                    >
                      <Pencil size={12} /> Edit
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-base text-offwhite">Application Access</h3>
        {(grants ?? []).length === 0 ? (
          <EmptyState title="No application accounts yet" description="Grants appear here once a lead is converted with application access." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {(grants ?? []).map((g) => {
              const company = companyById.get(g.company_id);
              const app = applications.find((a) => a.slug === g.application);
              if (!company || !app) return null;
              return (
                <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3.5">
                  <div>
                    <Link to={`/admin/customers/${company.id}`} className="text-sm font-semibold text-offwhite hover:text-lime">
                      {company.company_name}
                    </Link>
                    <p className="text-xs text-dim">{app.name} · granted {formatDate(g.activated_at)}</p>
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
