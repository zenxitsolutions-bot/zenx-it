import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, KeyRound, ShieldOff, ShieldCheck, Copy, Check } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { companiesService } from "../../services/companies";
import { applicationsService } from "../../services/applications";
import { enquiriesService } from "../../services/enquiries";
import { interactionsService } from "../../services/interactions";
import { followupsService } from "../../services/followups";
import { adminUsersService } from "../../services/adminUsers";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { AccountStatusBadge, StatusBadge } from "../../components/ui/Badges";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { ConversationTimeline } from "../../components/enquiries/ConversationTimeline";
import { ProgressTimeline } from "../../components/customers/ProgressTimeline";
import { LogoUpload } from "../../components/companies/LogoUpload";
import { CredentialRevealModal } from "../../components/customers/CredentialRevealModal";
import { generateTempPassword } from "../../utils/password";
import { formatDate, formatDateTime } from "../../utils/date";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [urlCopied, setUrlCopied] = useState(false);
  const [reveal, setReveal] = useState<{ email: string } | null>(null);
  const [revealPassword, setRevealPassword] = useState("");

  const { data: company, loading, refresh } = useLiveQuery(
    async () => (id ? companiesService.get(id) : null),
    [id],
    { tables: ["companies"] }
  );
  const { data: access, refresh: refreshAccess } = useLiveQuery(
    async () => (id ? companiesService.listApplicationAccess(id) : []),
    [id],
    { tables: ["application_access"] }
  );
  const { data: companyUsers } = useLiveQuery(
    async () => (id ? companiesService.listUsersForCompany(id) : []),
    [id],
    { tables: ["application_access", "users"] }
  );
  const { data: applications } = useLiveQuery(() => applicationsService.list(), []);
  const { data: enquiry } = useLiveQuery(
    async () => (company?.enquiry_id ? enquiriesService.get(company.enquiry_id) : null),
    [company?.enquiry_id]
  );
  const { data: interactions } = useLiveQuery(
    async () => (company?.enquiry_id ? interactionsService.listForEnquiry(company.enquiry_id) : []),
    [company?.enquiry_id]
  );
  const { data: followups } = useLiveQuery(
    async () => (company?.enquiry_id ? followupsService.listForEnquiry(company.enquiry_id) : []),
    [company?.enquiry_id]
  );
  const { data: admins } = useLiveQuery(() => adminUsersService.list(), []);
  const { data: wellness, refresh: refreshWellness } = useLiveQuery(
    async () => (id ? companiesService.listWellnessClients(id) : { clients: [], dietitians: [] }),
    [id]
  );

  if (loading || !company) return <SkeletonRows rows={5} />;

  const appBySlug = new Map((applications ?? []).map((a) => [a.slug, a]));
  const primaryContact = companyUsers?.[0]?.user ?? null;
  const firstActivated = (access ?? [])
    .filter((a) => a.activated_at)
    .sort((a, b) => +new Date(a.activated_at!) - +new Date(b.activated_at!))[0];

  const handleToggleCompanyStatus = async () => {
    const disabling = company.status === "ACTIVE";
    const ok = await confirm({
      title: disabling ? "Deactivate this company?" : "Activate this company?",
      description: disabling
        ? `Every person at ${company.company_name} will lose access to their applications until reactivated.`
        : `${company.company_name} will regain access to their applications.`,
      danger: disabling,
      confirmLabel: disabling ? "Deactivate Company" : "Activate Company",
    });
    if (!ok || !profile) return;
    await companiesService.setStatus(company.id, disabling ? "INACTIVE" : "ACTIVE", profile.id);
    toast(disabling ? "Company deactivated" : "Company activated");
    refresh();
    refreshWellness();
  };

  const handleResetPassword = async (userId: string, email: string) => {
    const ok = await confirm({
      title: "Reset this person's password?",
      description: `A new temporary password will be set for ${email}. They'll be required to change it on their next login.`,
    });
    if (!ok) return;
    const newPassword = generateTempPassword();
    await companiesService.setCustomerPassword(userId, newPassword);
    setRevealPassword(newPassword);
    setReveal({ email });
  };

  const handleToggleAccess = async (accessId: string, current: "ACTIVE" | "DISABLED", appName: string) => {
    const activating = current === "DISABLED";
    const ok = await confirm({
      title: activating ? `Activate ${appName}?` : `Disable ${appName} access?`,
      description: !activating ? `${company.company_name} will immediately lose access to ${appName}.` : undefined,
      danger: !activating,
      confirmLabel: activating ? "Activate" : "Disable Access",
    });
    if (!ok || !profile) return;
    await companiesService.setApplicationAccess(accessId, activating ? "ACTIVE" : "DISABLED", profile.id);
    toast(activating ? "Application access activated" : "Application access disabled");
    refreshAccess();
    refreshWellness();
  };

  const handleChangeDietitian = async (userId: string, dietitianId: string) => {
    if (!id) return;
    try {
      await companiesService.setWellnessDietitian(id, userId, dietitianId || null);
      toast("Dietitian updated");
      refreshWellness();
    } catch {
      toast("Could not update the dietitian");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to="/admin/customers" className="flex w-fit items-center gap-1.5 text-xs text-muted hover:text-lime">
        <ArrowLeft size={13} /> Back to customers
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <LogoUpload
              companyId={company.id}
              logoUrl={company.logo_url}
              onChange={() => refresh()}
            />
            <div>
              <h2 className="font-display text-2xl text-offwhite">{company.company_name}</h2>
              <p className="mt-1 text-sm text-muted">
                {primaryContact ? `${primaryContact.first_name} ${primaryContact.last_name}` : "No contact yet"}
              </p>
            </div>
          </div>
          <AccountStatusBadge status={company.status} />
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-5 text-sm text-muted">
          {company.company_phone && <span>{company.company_phone}</span>}
          {company.company_email && <span>{company.company_email}</span>}
          {company.website && <span>{company.website}</span>}
        </div>
        {(company.address_line1 || company.city) && (
          <div className="mt-2 text-sm text-muted">
            {[company.address_line1, company.address_line2, company.city, company.state, company.zip, company.country]
              .filter(Boolean)
              .join(", ")}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
          <span className="text-xs uppercase tracking-wider text-dim">Company URL</span>
          <code className="text-sm text-offwhite">/{company.company_slug}</code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(`/${company.company_slug}`);
              setUrlCopied(true);
              setTimeout(() => setUrlCopied(false), 1500);
            }}
          >
            {urlCopied ? <Check size={13} /> : <Copy size={13} />}
            {urlCopied ? "Copied" : "Copy Company URL"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Applications</h3>
            <div className="flex flex-col gap-3">
              {(access ?? []).length === 0 && <p className="text-sm text-dim">No application access granted.</p>}
              {(access ?? []).map((a) => {
                const app = appBySlug.get(a.application);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-md border border-border p-3.5">
                    <div>
                      <p className="text-sm font-semibold text-offwhite">{app?.name ?? "Application"}</p>
                      <AccountStatusBadge status={a.status} />
                      {app?.url && <p className="mt-1 truncate text-xs text-dim">{app.url}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant={a.status === "ACTIVE" ? "danger" : "secondary"}
                      onClick={() => handleToggleAccess(a.id, a.status, app?.name ?? "this application")}
                    >
                      {a.status === "ACTIVE" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      {a.status === "ACTIVE" ? "Disable Access" : "Activate Access"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>

          {(wellness?.clients?.length ?? 0) > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 font-display text-base text-offwhite">Nourishly clients</h3>
              <div className="flex flex-col gap-3">
                {wellness!.clients.map((client) => (
                  <div key={client.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3.5">
                    <div>
                      <p className="text-sm font-semibold text-offwhite">{client.name}</p>
                      <p className="text-xs text-dim">
                        {client.email}
                        {client.account_status !== "active" ? ` · ${client.account_status}` : ""}
                      </p>
                    </div>
                    <label className="flex flex-col gap-1 text-xs text-dim">
                      Assigned dietitian
                      <select
                        className="rounded-md border border-border bg-ink px-2 py-1.5 text-sm text-offwhite"
                        value={client.assigned_dietitian_id ?? ""}
                        onChange={(e) => handleChangeDietitian(client.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {(wellness?.dietitians ?? [])
                          .filter((d) => d.account_status === "active")
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Users</h3>
            <div className="flex flex-col gap-3">
              {(companyUsers ?? []).length === 0 && <p className="text-sm text-dim">No users yet.</p>}
              {(companyUsers ?? []).map(({ grant, user }) => {
                if (!user) return null;
                const app = appBySlug.get(grant.application);
                return (
                  <div key={grant.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3.5">
                    <div>
                      <p className="text-sm font-semibold text-offwhite">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-dim">
                        {user.email} · {grant.role} · {app?.name ?? grant.application}
                        {user.must_change_password ? " · must change password on next login" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleResetPassword(user.id, user.email)}>
                        <KeyRound size={13} /> Reset Password
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Account</h3>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-xs uppercase tracking-wider text-dim">Created</dt>
                <dd className="text-offwhite">{formatDate(company.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs uppercase tracking-wider text-dim">Last login</dt>
                <dd className="text-offwhite">
                  {primaryContact?.last_login ? formatDateTime(primaryContact.last_login) : "Never"}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-col gap-2.5">
              <Button
                size="sm"
                variant={company.status === "ACTIVE" ? "danger" : "secondary"}
                onClick={handleToggleCompanyStatus}
              >
                {company.status === "ACTIVE" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                {company.status === "ACTIVE" ? "Deactivate Company" : "Activate Company"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Business Progress</h3>
            <ProgressTimeline
              steps={[
                { label: "Lead Created", date: enquiry?.created_at ?? null },
                { label: "Contacted", date: interactions?.length ? interactions[interactions.length - 1].created_at : null },
                { label: "Follow-up", date: followups?.length ? followups[0].created_at : null },
                { label: "Converted", date: enquiry?.converted_at ?? null },
                { label: "Application Activated", date: firstActivated?.activated_at ?? null },
              ]}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          {enquiry && (
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base text-offwhite">Lead History</h3>
                <StatusBadge status={enquiry.status} />
              </div>
              <dl className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-xs uppercase tracking-wider text-dim">Original service</dt>
                  <dd className="text-offwhite">{enquiry.service}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs uppercase tracking-wider text-dim">Source</dt>
                  <dd className="text-offwhite">{enquiry.source}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs uppercase tracking-wider text-dim">Enquiry created</dt>
                  <dd className="text-offwhite">{formatDate(enquiry.created_at)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-xs uppercase tracking-wider text-dim">Converted</dt>
                  <dd className="text-offwhite">{formatDate(enquiry.converted_at)}</dd>
                </div>
              </dl>
              <Link to={`/admin/enquiries/${enquiry.id}`} className="mt-4 inline-block text-xs text-lime hover:underline">
                View original enquiry →
              </Link>
            </Card>
          )}

          <Card className="p-6">
            <h3 className="mb-4 font-display text-base text-offwhite">Conversations</h3>
            <ConversationTimeline interactions={interactions ?? []} admins={admins ?? []} />
          </Card>
        </div>
      </div>

      <CredentialRevealModal
        open={!!reveal}
        onClose={() => {
          toast("Password reset");
          setReveal(null);
        }}
        email={reveal?.email ?? ""}
        password={revealPassword}
        title="Password reset"
      />
    </div>
  );
}
