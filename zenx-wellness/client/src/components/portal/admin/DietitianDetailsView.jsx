import { formatCalendarDate } from '@/lib/calendarDate';
import { ACCOUNT_STATUS_LABEL } from '@/lib/accountStatus';

function InfoRow({ label, value }) {
  return (
    <div className="grid gap-1 border-b border-line/60 py-3 last:border-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm text-forest whitespace-pre-wrap">{value || '—'}</dd>
    </div>
  );
}

export function DietitianDetailsView({ dietitian }) {
  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <dl>
        <InfoRow label="Full name" value={dietitian.name} />
        <InfoRow label="Email" value={dietitian.email} />
        <InfoRow label="Phone" value={dietitian.phone} />
        <InfoRow label="Address" value={dietitian.address} />
        <InfoRow label="Credentials" value={dietitian.qualifications} />
        <InfoRow
          label="Date of joining"
          value={
            dietitian.joinedOn
              ? formatCalendarDate(dietitian.joinedOn, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
              : null
          }
        />
        <InfoRow label="Account status" value={ACCOUNT_STATUS_LABEL[dietitian.accountStatus ?? 'active']} />
        <InfoRow label="Timezone" value={dietitian.timezone} />
      </dl>
    </section>
  );
}
