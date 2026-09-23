import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateTimezone } from '@/hooks/useUsers';
import { useViewerTimezone } from '@/hooks/useViewerTimezone';
import { TimezoneSelect, isKnownTimezone } from '@/components/shared/TimezoneSelect';

// Saved separately from automatically detected display time, so travel cannot move weekly hours.
export function TimezoneField() {
  const { user, updateUser } = useAuth();
  const updateTimezone = useUpdateTimezone();
  const { scheduleTimezone: savedTimezone } = useViewerTimezone();
  const [value, setValue] = useState(savedTimezone);
  useEffect(() => setValue(savedTimezone), [savedTimezone]);

  const dirty = value !== (user.timezone || 'UTC');
  const isValid = isKnownTimezone(value);

  function save() {
    updateTimezone.mutate(value, {
      onSuccess: (updated) => {
        updateUser(updated);
        toast.success('Timezone saved.');
      },
      onError: () => toast.error("We couldn't save that — please try again."),
    });
  }

  return (
    <div className="rounded-xl bg-cream p-3">
      <label className="block text-xs font-bold text-muted-foreground" htmlFor="dietitian-timezone">
        Working-hours time zone
      </label>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Weekly hours and blocks below are set in this timezone — clients always see them converted to their own.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <TimezoneSelect id="dietitian-timezone" value={value} onChange={setValue} className="max-w-xs" />
        {dirty && (
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={updateTimezone.isPending || !isValid}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {updateTimezone.isPending ? 'Saving…' : 'Save'}
          </Button>
        )}
      </div>
      {dirty && !isValid && <p className="mt-1 text-xs text-destructive">Not a recognized timezone name.</p>}
    </div>
  );
}
