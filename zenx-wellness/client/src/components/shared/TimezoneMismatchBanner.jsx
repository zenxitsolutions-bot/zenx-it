import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateTimezone } from '@/hooks/useUsers';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';

const DISMISS_KEY = 'nourishly:timezoneMismatchDismissed';

// A travelling dietitian still sees local times, but moving their weekly working hours
// requires a deliberate change. Clients never need to manually convert or update a zone.
export function TimezoneMismatchBanner() {
  const { user, updateUser } = useAuth();
  const { mismatch, browserTimezone, scheduleTimezone } = useViewerTimezone();
  const updateTimezone = useUpdateTimezone();
  const dismissValue = `${user?._id ?? user?.id}:${browserTimezone}:${scheduleTimezone}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; }
  });

  if (user?.role !== 'dietitian' || !mismatch || dismissed === dismissValue) return null;

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, dismissValue); } catch { /* Storage may be disabled. */ }
    setDismissed(dismissValue);
  }

  function update() {
    updateTimezone.mutate(browserTimezone, {
      onSuccess: (updated) => {
        updateUser(updated);
        toast.success('Working-hours timezone updated.');
        dismiss();
      },
      onError: () => toast.error("We couldn't update that — please try again."),
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-coral/10 px-5 py-2.5 text-sm text-forest">
      <p>
        Times are automatically shown in <strong className="text-coral">{browserTimezone}</strong>.
        {' '}Your weekly working hours stay in <strong className="text-coral">{scheduleTimezone}</strong>.
        {' '}Only update working hours if you want to move your schedule to this time zone.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Button type="button" size="sm" onClick={update} disabled={updateTimezone.isPending}>
          {updateTimezone.isPending ? 'Updating…' : 'Update working-hours zone'}
        </Button>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 text-muted-foreground hover:bg-cream">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
