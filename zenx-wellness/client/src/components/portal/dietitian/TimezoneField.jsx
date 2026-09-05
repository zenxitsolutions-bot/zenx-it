import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateTimezone } from '@/hooks/useUsers';
import { browserTimezone } from '@/lib/timezone';
import { TimezoneSelect, isKnownTimezone } from '@/components/shared/TimezoneSelect';

const BROWSER_TIMEZONE = browserTimezone();

// Spec §2026-round2-fixes item 7: the IANA zone weekly hours/exceptions below are interpreted in —
// stored on the dietitian's own profile (`users.timezone`), not inferred silently from whichever
// browser happens to submit the weekly-hours form. Pre-fills with the browser's detected zone only
// when nothing's been saved yet ("UTC", the column default) — still requires an explicit Save, so
// a dietitian never gets relocated without noticing.
export function TimezoneField() {
  const { user, updateUser } = useAuth();
  const updateTimezone = useUpdateTimezone();
  const savedTimezone = user.timezone && user.timezone !== 'UTC' ? user.timezone : BROWSER_TIMEZONE;
  const [value, setValue] = useState(savedTimezone);

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
        Your timezone
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
