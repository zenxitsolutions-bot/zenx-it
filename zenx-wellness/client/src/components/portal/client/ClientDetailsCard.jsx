import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dietPreferenceLabel } from '@/lib/dietPreferences';
import { PreferencesDialog } from '@/components/portal/shared/PreferencesDialog';

export function ClientDetailsCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-card border border-line bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-forest">Your details</h2>
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-forest hover:underline">
          Edit
        </button>
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Name</dt>
          <dd className="text-right text-forest">{user.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Email</dt>
          <dd className="text-right text-forest">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="text-right text-forest">{user.phone || '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Diet preference</dt>
          <dd className="text-right text-forest">{dietPreferenceLabel(user.dietPreference)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Allergies</dt>
          <dd className="text-right text-forest">{user.allergies || '—'}</dd>
        </div>
      </dl>
      <PreferencesDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
