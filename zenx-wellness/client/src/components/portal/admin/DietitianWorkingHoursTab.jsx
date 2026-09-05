import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { WeeklyHoursForm } from '@/components/portal/dietitian/WeeklyHoursForm';
import { useUpdateUser } from '@/hooks/useUsers';
import { browserTimezone } from '@/lib/timezone';
import { TimezoneSelect, isKnownTimezone } from '@/components/shared/TimezoneSelect';

// Timezone + weekly hours, admin-on-behalf-of a named dietitian — spec §2026-round2-fixes item 2:
// "must write to the same availability model the booking engine reads." WeeklyHoursForm below is
// the exact same component (and the exact same GET/PUT /availability/weekly-hours model) the
// dietitian's own self-service Availability screen uses, just given a dietitianId instead of
// defaulting to "self" — not a second copy of either the UI or the data.
export function DietitianWorkingHoursTab({ dietitian }) {
  const updateUser = useUpdateUser();
  const savedTimezone = dietitian.timezone && dietitian.timezone !== 'UTC' ? dietitian.timezone : browserTimezone();
  const [value, setValue] = useState(savedTimezone);

  useEffect(() => {
    setValue(savedTimezone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dietitian._id]);

  const dirty = value !== (dietitian.timezone || 'UTC');
  const isValid = isKnownTimezone(value);

  function saveTimezone() {
    updateUser.mutate(
      { userId: dietitian._id, timezone: value },
      {
        onSuccess: () => toast.success('Timezone saved.'),
        onError: () => toast.error("We couldn't save that — please try again."),
      }
    );
  }

  return (
    <div className="grid gap-8">
      <section className="rounded-card bg-white p-6 shadow-soft">
        <h2 className="text-lg text-forest">Timezone</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Weekly hours below are set in this timezone — clients always see them converted to their own.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TimezoneSelect id="dietitian-profile-timezone" value={value} onChange={setValue} className="max-w-xs" />
          {dirty && (
            <Button
              type="button"
              size="sm"
              onClick={saveTimezone}
              disabled={updateUser.isPending || !isValid}
              className="rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updateUser.isPending ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>
        {dirty && !isValid && <p className="mt-1 text-xs text-destructive">Not a recognized timezone name.</p>}
      </section>

      <section>
        <h2 className="mb-3 text-lg text-forest">Weekly hours</h2>
        <WeeklyHoursForm dietitianId={dietitian._id} />
      </section>
    </div>
  );
}
