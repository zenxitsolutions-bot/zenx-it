import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../ui/Button";
import { useAuth } from "../../context/AuthContext";
import { useViewerTimezone } from "../../hooks/useViewerTimezone";
import { authService } from "../../services/auth";
import { useToast } from "../../context/ToastContext";

const DISMISS_KEY = "zenx-admin:timezoneMismatchDismissed";

// Login-time prompt (spec item 7) — mirrors wellness-app's own
// client/src/components/shared/TimezoneMismatchBanner.jsx. Only fires for a REAL saved preference
// mismatch (useViewerTimezone's `mismatch` already excludes the DB's plain 'UTC' default), never on
// a brand-new account that simply hasn't set one yet.
export function TimezoneMismatchBanner() {
  const { profile, updateProfile } = useAuth();
  const { mismatch, browserTimezone } = useViewerTimezone();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === profile?.id);

  if (!profile || !mismatch || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, profile!.id);
    setDismissed(true);
  }

  async function update() {
    setSaving(true);
    try {
      const updated = await authService.updateMe({ timezone: browserTimezone });
      updateProfile(updated);
      toast("Timezone updated");
    } catch {
      toast("We couldn't update that — please try again");
    } finally {
      setSaving(false);
      dismiss();
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-lime/10 px-5 py-2.5 text-sm text-offwhite">
      <p>
        Your device timezone appears to be <strong className="text-lime">{browserTimezone}</strong>. Your profile is currently set to{" "}
        <strong className="text-lime">{profile.timezone}</strong>. Would you like to update it?
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" onClick={update} disabled={saving} className="h-8 px-3 text-xs">
          {saving ? "Updating…" : "Update"}
        </Button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 text-muted hover:bg-white/10">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
