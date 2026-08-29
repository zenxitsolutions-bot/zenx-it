import { useState } from "react";
import { UserPlus, ShieldOff, ShieldCheck, Lock } from "lucide-react";
import { useLiveQuery } from "../../hooks/useLiveQuery";
import { adminUsersService } from "../../services/adminUsers";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useToast } from "../../context/ToastContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Field";
import { AccountStatusBadge } from "../../components/ui/Badges";
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

  const { data: admins, loading, refresh } = useLiveQuery(() => adminUsersService.list(), [], { tables: ["profiles"] });

  const canManage = profile?.role === "Super Admin" || profile?.role === "Admin";

  if (loading || !admins) return <SkeletonRows rows={4} />;

  if (!canManage) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Lock className="text-dim" size={22} />
        <p className="text-sm text-muted">Your role ({profile?.role}) doesn't have access to admin user management.</p>
      </Card>
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus size={14} /> Invite Admin
        </Button>
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-panel text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Role</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Joined</th>
              <th className="px-5 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-5 py-3.5 font-semibold text-offwhite">{a.first_name} {a.last_name}</td>
                <td className="px-5 py-3.5 text-muted">{a.email}</td>
                <td className="px-5 py-3.5">
                  <Select
                    value={a.role}
                    onChange={(e) => handleRoleChange(a.id, e.target.value as AdminRole)}
                    className="!w-40 !py-1.5 text-xs"
                    disabled={a.id === profile?.id}
                  >
                    {ADMIN_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-5 py-3.5">
                  <AccountStatusBadge status={a.status} />
                </td>
                <td className="px-5 py-3.5 text-dim">{formatDate(a.created_at)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Button
                    size="sm"
                    variant={a.status === "ACTIVE" ? "danger" : "secondary"}
                    disabled={a.id === profile?.id}
                    onClick={() => handleToggleStatus(a.id, a.status, a.email)}
                  >
                    {a.status === "ACTIVE" ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                    {a.status === "ACTIVE" ? "Disable" : "Enable"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <InviteAdminModal open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={() => { setInviteOpen(false); refresh(); }} />
    </div>
  );
}
