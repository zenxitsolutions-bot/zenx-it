import { useState } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";

interface CredentialRevealModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  password: string;
  title?: string;
  subtitle?: string;
}

/**
 * Shows a login email + temporary password exactly once, right after it's set —
 * this is the only moment the app ever displays it. Nothing here persists the
 * password; close this and it's gone from the UI for good (the customer can
 * always get a fresh one via Reset Password).
 */
export function CredentialRevealModal({
  open,
  onClose,
  email,
  password,
  title = "Temporary password set",
  subtitle,
}: CredentialRevealModalProps) {
  const [copied, setCopied] = useState<"email" | "password" | null>(null);

  const copy = (which: "email" | "password", value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} width="sm">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-md border border-yellow/30 bg-yellow/5 px-3.5 py-2.5 text-xs text-yellow">
          <AlertTriangle size={14} className="shrink-0" />
          This password is shown once. The customer will be prompted to set their own on first login.
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Login email</span>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-ink px-3.5 py-2.5">
            <code className="text-sm text-offwhite">{email}</code>
            <button onClick={() => copy("email", email)} className="shrink-0 text-dim hover:text-lime">
              {copied === "email" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Temporary password</span>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-ink px-3.5 py-2.5">
            <code className="text-sm text-offwhite">{password}</code>
            <button onClick={() => copy("password", password)} className="shrink-0 text-dim hover:text-lime">
              {copied === "password" ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <Button className="mt-1 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
