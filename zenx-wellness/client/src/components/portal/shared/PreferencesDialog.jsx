import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePreferences } from '@/hooks/useUsers';
import { PreferencesFields } from './PreferencesFields';
import { isKnownTimezone } from '@/components/shared/TimezoneSelect';

function toFormValues(user) {
  return {
    timezone: user.timezone || 'UTC',
    country: user.country || '',
    dateFormat: user.dateFormat || 'MMM d, yyyy',
    timeFormat: user.timeFormat || '12h',
  };
}

// The "My Account" mount point for spec item 8 — reachable from PortalHeader.jsx's "Settings" menu
// item for every role (client/dietitian/admin), not a full settings-page redesign. Dietitians still
// have their own richer "weekly hours" timezone field (AvailabilityScreen.jsx) for the
// availability-specific framing; this is the generic profile-preferences surface every role gets.
export function PreferencesDialog({ open, onOpenChange }) {
  const { user, updateUser } = useAuth();
  const updatePreferences = useUpdatePreferences();
  const [values, setValues] = useState(() => toFormValues(user));

  useEffect(() => {
    if (open) setValues(toFormValues(user));
  }, [open, user]);

  const isValid = isKnownTimezone(values.timezone) && (values.country === '' || /^[A-Z]{2}$/.test(values.country));

  function save() {
    updatePreferences.mutate(
      { ...values, country: values.country || null },
      {
        onSuccess: (updated) => {
          updateUser(updated);
          toast.success('Preferences saved.');
          onOpenChange(false);
        },
        onError: () => toast.error("We couldn't save that — please try again."),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>My account</DialogTitle>
          <DialogDescription>Timezone and display preferences for how dates and times show up for you.</DialogDescription>
        </DialogHeader>

        <PreferencesFields
          timezone={values.timezone}
          onTimezoneChange={(timezone) => setValues((v) => ({ ...v, timezone }))}
          country={values.country}
          onCountryChange={(country) => setValues((v) => ({ ...v, country }))}
          dateFormat={values.dateFormat}
          onDateFormatChange={(dateFormat) => setValues((v) => ({ ...v, dateFormat }))}
          timeFormat={values.timeFormat}
          onTimeFormatChange={(timeFormat) => setValues((v) => ({ ...v, timeFormat }))}
        />

        <DialogFooter>
          <Button
            type="button"
            onClick={save}
            disabled={updatePreferences.isPending || !isValid}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {updatePreferences.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
