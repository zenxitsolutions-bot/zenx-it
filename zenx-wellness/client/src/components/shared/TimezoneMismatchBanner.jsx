import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateTimezone } from '@/hooks/useUsers';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';

const DISMISS_KEY = 'nourishly:timezoneMismatchDismissed';

// Login-time prompt (spec item 7): if the browser's detected zone differs from a REAL saved
// preference (not the DB's 'UTC' default — useViewerTimezone's `mismatch` already excludes that
// case), ask before ever silently changing what zone the account's times render in. Dismissing is
// per-session (sessionStorage), same dedupe convention as useCallReminders.js's shown-toasts set —
// re-prompts next login rather than never again, since a traveling user's mismatch is often real
// and worth re-surfacing.
export function TimezoneMismatchBanner() {
  const { user, updateUser } = useAuth();
  const { mismatch, browserTimezone } = useViewerTimezone();
  const updateTimezone = useUpdateTimezone();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === user?.id);

  if (!mismatch || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, user.id);
    setDismissed(true);
  }

  function update() {
    updateTimezone.mutate(browserTimezone, {
      onSuccess: (updated) => {
        updateUser(updated);
        toast.success('Timezone updated.');
      },
      onError: () => toast.error("We couldn't update that — please try again."),
    });
    dismiss();
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-yellow px-4 py-2.5 text-sm text-forest">
      <p>
        Your device timezone appears to be <strong>{browserTimezone}</strong>. Your profile is currently set to{' '}
        <strong>{user.timezone}</strong>. Would you like to update it?
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" onClick={update} disabled={updateTimezone.isPending} className="rounded-full bg-coral text-white hover:bg-coral/90">
          {updateTimezone.isPending ? 'Updating…' : 'Update'}
        </Button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 hover:bg-forest/10">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
