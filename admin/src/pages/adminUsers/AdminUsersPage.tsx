import { useMemo, useState } from "react";
import { UserPlus, ShieldOff, ShieldCheck, Lock, KeyRound, Search, Users2 } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { adminUsersService } from "../../services/adminUsers";
import { authService } from "../../services/auth";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select, Input } from "../../components/ui/Field";
import { AccountStatusBadge } from "../../components/ui/Badges";
import { PageHeader, MetaChip } from "../../components/ui/PageHeader";
import { TableWrap, THead, TH, TR, TD } from "../../components/ui/Table";
import { EmptyState } from "../../components/ui/EmptyState";
import { SkeletonRows } from "../../components/ui/Skeleton";
import { InviteAdminModal } from "../../components/adminUsers/InviteAdminModal";
import { ADMIN_ROLES } from "../../types/domain";
import type { AdminRole } from "../../types/domain";
import { formatDate } from "../../utils/date";

export default function AdminUsersPage() {
  const { profile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | AdminRole>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");

  const { data: admins, loading, refresh } = useLiveQuery(() => adminUsersService.list(), [], {
    tables: ["profiles"],
  });

  const canManage = profile?.role === "Super Admin" || profile?.role === "Admin";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (admins ?? []).filter((a) => {
      if (roleFilter !== "ALL" && a.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (!q) return true;
      return `${a.first_name} ${a.last_name} ${a.email}`.toLowerCase().includes(q);
    });
  }, [admins, search, roleFilter, statusFilter]);

  if (loading || !admins) return <SkeletonRows rows={4} />;

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        title="No access to user management"
        description={`Your role (${profile?.role}) can't view or manage admin users.`}
      />
    );
  }

  const handleToggleStatus = async (id: string, status: "ACTIVE" | "DISABLED", email: string) => {
    const disabling = status === "ACTIVE";
    const ok = await confirm({
      title: disabling ? "Disable this admin?" : "Enable this admin?",
      description: `${email} will ${disabling ? "lose" : "regain"} access to the admin portal.`,
      danger: disabling,
      confirmLabel: disabling ? "Disable" : "Enable",
    });
    if (!ok || !profile) return;
    await adminUsersService.setStatus(id, disabling ? "DISABLED" : "ACTIVE", profile.id);
    toast(disabling ? "Admin disabled" : "Admin enabled");
    refresh();
  };

  const handleRoleChange = async (id: string, role: AdminRole) => {
    if (!profile) return;
    await adminUsersService.setRole(id, role, profile.id);
    toast("Role updated");
    refresh();
  };

  /* Reuses the same reset-email path as the login page's "forgot password" rather than setting a
     password directly: an admin triggering a reset should never learn the new credential. */
  const handleResetPassword = async (email: string) => {
    const ok = await confirm({
      title: "Send a password reset?",
      description: `${email} will receive an email with a link to choose a new password. Their current password keeps working until they use it.`,
      confirmLabel: "Send reset email",
    });
    if (!ok) return;
    await authService.sendPasswordReset(email);
    toast("Password reset email sent");
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        description="ZenX staff with access to this portal. Roles control which sections each person sees."
        meta={<MetaChip>{filtered.length} of {admins.length} users</MetaChip>}
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={14} /> Invite Admin
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="pl-9"
              aria-label="Search admin users"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "ALL" | AdminRole)}
            className="w-auto min-w-[150px]"
            aria-label="Filter by role"
          >
            <option value="ALL">All roles</option>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
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
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users2}
            title="No users match those filters"
            description="Try a different search term, role or status."
            className="m-4 border-0 bg-transparent"
          />
        ) : (
          <TableWrap>
            <THead>
              <TH className="pl-5">User</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH>Joined</TH>
              <TH className="pr-5 text-right">Actions</TH>
            </THead>
            <tbody>
              {filtered.map((a) => {
                const isSelf = a.id === profile?.id;
                return (
                  <TR key={a.id}>
                    <TD className="pl-5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime/12 text-xs font-bold text-lime">
                          {a.first_name[0]}
                          {a.last_name[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-offwhite">
                            {a.first_name} {a.last_name}
                            {isSelf && <span className="ml-1.5 text-[10px] font-medium text-dim">(you)</span>}
                          </p>
                          <p className="truncate text-xs text-muted">{a.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Select
                        value={a.role}
                        onChange={(e) => handleRoleChange(a.id, e.target.value as AdminRole)}
                        className="!w-40 !py-1.5 text-xs"
                        // Changing your own role could lock you out of this very page mid-session.
                        disabled={isSelf}
                        aria-label={`Role for ${a.email}`}
                      >
                        {ADMIN_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </TD>
                    <TD>
                      <AccountStatusBadge status={a.status} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-dim">{formatDate(a.created_at)}</TD>
                    <TD className="pr-5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => handleResetPassword(a.email)}>
                          <KeyRound size={13} /> Reset
                        </Button>
                        <Button
                          size="sm"
                          variant={a.status === "ACTIVE" ? "danger" : "secondary"}
                          disabled={isSelf}
                          onClick={() => handleToggleStatus(a.id, a.status, a.email)}
                        >
                          {a.status === "ACTIVE" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                          {a.status === "ACTIVE" ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <InviteAdminModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => {
          setInviteOpen(false);
          refresh();
        }}
      />
    </div>
  );
}
