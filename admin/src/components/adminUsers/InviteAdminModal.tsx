import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { FieldWrap, Input, Select } from "../ui/Field";
import { Button } from "../ui/Button";
import { ADMIN_ROLES } from "../../types/domain";
import type { AdminRole } from "../../types/domain";
import { adminUsersService } from "../../services/adminUsers";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

export function InviteAdminModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("Sales");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await adminUsersService.invite({ first_name: firstName, last_name: lastName, email, role }, profile.id);
      toast("Admin invited");
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("Sales");
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite Admin User">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="First name" htmlFor="a-first">
            <Input id="a-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </FieldWrap>
          <FieldWrap label="Last name" htmlFor="a-last">
            <Input id="a-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </FieldWrap>
        </div>
        <FieldWrap label="Email" htmlFor="a-email">
          <Input id="a-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </FieldWrap>
        <FieldWrap label="Role" htmlFor="a-role">
          <Select id="a-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {ADMIN_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FieldWrap>
        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Inviting…" : "Send invite"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
