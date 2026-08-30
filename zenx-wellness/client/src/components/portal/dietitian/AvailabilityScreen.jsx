import { useState } from 'react';
import { TimezoneField } from './TimezoneField';
import { WeeklyHoursForm } from './WeeklyHoursForm';
import { AvailabilityExceptionList } from './AvailabilityExceptionList';
import { AvailabilityExceptionFormDialog } from './AvailabilityExceptionFormDialog';

export function AvailabilityScreen() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-3 text-lg text-forest">Weekly hours</h2>
        <TimezoneField />
        <div className="mt-4">
          <WeeklyHoursForm />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg text-forest">Blocks &amp; extra hours</h2>
          <button type="button" onClick={() => setDialogOpen(true)} className="text-sm font-semibold text-coral hover:underline">
            + Add
          </button>
        </div>
        <AvailabilityExceptionList />
      </section>

      <AvailabilityExceptionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
