import { useEffect, useState } from 'react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useUpdatePreferences } from '@/hooks/useUsers';
import { toE164OrEmpty } from '@/lib/phone';
import { DIET_PREFERENCES } from '@/lib/dietPreferences';
import { PreferencesFields } from './PreferencesFields';
import { isKnownTimezone } from '@/components/shared/TimezoneSelect';

function toFormValues(user) {
  return {
    name: user.name || '',
    phone: toE164OrEmpty(user.phone),
    dietPreference: user.dietPreference ?? 'none',
    allergies: user.allergies ?? '',
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
// Clients also edit name, phone, and diet notes here (PATCH /users/me).
export function PreferencesDialog({ open, onOpenChange }) {
  const { user, updateUser } = useAuth();
  const updatePreferences = useUpdatePreferences();
  const [values, setValues] = useState(() => toFormValues(user));
  const isClient = user.role === 'client';

  useEffect(() => {
    if (open) setValues(toFormValues(user));
  }, [open, user]);

  const nameOk = !isClient || values.name.trim().length > 0;
  const phoneOk = !values.phone || isValidPhoneNumber(values.phone);
  const allergiesOk = (values.allergies ?? '').length <= 1000;
  const prefsOk = isKnownTimezone(values.timezone) && (values.country === '' || /^[A-Z]{2}$/.test(values.country));
  const isValid = nameOk && phoneOk && allergiesOk && prefsOk;

  function save() {
    const patch = {
      timezone: values.timezone,
      country: values.country || null,
      dateFormat: values.dateFormat,
      timeFormat: values.timeFormat,
    };
    if (isClient) {
      patch.name = values.name.trim();
      patch.phone = values.phone || '';
      patch.dietPreference = values.dietPreference !== 'none' ? values.dietPreference : null;
      patch.allergies = values.allergies?.trim() ? values.allergies.trim() : null;
    }

    updatePreferences.mutate(patch, {
      onSuccess: (updated) => {
        updateUser(updated);
        toast.success(isClient ? 'Account details saved.' : 'Preferences saved.');
        onOpenChange(false);
      },
      onError: () => toast.error("We couldn't save that — please try again."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isClient ? 'sm:max-w-md' : 'sm:max-w-sm'}>
        <DialogHeader>
          <DialogTitle>My account</DialogTitle>
          <DialogDescription>
            {isClient
              ? 'Update your contact details, diet notes, and how dates and times show up for you.'
              : 'Timezone and display preferences for how dates and times show up for you.'}
          </DialogDescription>
        </DialogHeader>

        {isClient && (
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-forest" htmlFor="account-name">
                Name
              </label>
              <Input
                id="account-name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                autoComplete="name"
              />
              {!nameOk && <p className="text-xs text-destructive">Enter your name.</p>}
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-forest" htmlFor="account-phone">
                Phone number
              </label>
              <PhoneInput
                id="account-phone"
                value={values.phone}
                onChange={(phone) => setValues((v) => ({ ...v, phone: phone || '' }))}
              />
              {!phoneOk && <p className="text-xs text-destructive">Enter a valid phone number.</p>}
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-forest" htmlFor="account-diet">
                Diet preference
              </label>
              <Select
                value={values.dietPreference}
                onValueChange={(dietPreference) => setValues((v) => ({ ...v, dietPreference }))}
              >
                <SelectTrigger id="account-diet" className="w-full">
                  <SelectValue placeholder="Choose a preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {DIET_PREFERENCES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-forest" htmlFor="account-allergies">
                Allergies
              </label>
              <Textarea
                id="account-allergies"
                rows={2}
                placeholder="e.g. peanuts, lactose, gluten"
                value={values.allergies}
                onChange={(e) => setValues((v) => ({ ...v, allergies: e.target.value }))}
              />
            </div>
          </div>
        )}

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
