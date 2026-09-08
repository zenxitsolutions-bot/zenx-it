import { formatCalendarDate } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';

export function SavedPlansPanel({ plans, clients, activePlanId, onSelectTitle }) {
  if (!plans?.length) {
    return (
      <section className="rounded-card bg-white p-5 shadow-soft">
        <h2 className="text-xl text-forest">Saved weekly plans</h2>
        <p className="mt-1 text-sm text-muted-foreground">Plans you save here keep their title.</p>
        <p className="mt-4 text-sm text-dim">No saved weekly plans yet — publish a week and choose to save it for reuse.</p>
      </section>
    );
  }

  return (
    <section className="rounded-card bg-white p-5 shadow-soft">
      <h2 className="text-xl text-forest">Saved weekly plans</h2>
      <p className="mt-1 text-sm text-muted-foreground">Saved weeks you can assign again.</p>
      <ul className="mt-4 grid gap-2">
        {plans.map((plan) => {
          const clientName = clients.find((c) => c._id === plan.client)?.name ?? 'Unassigned client';
          return (
            <li key={plan._id}>
              <button
                type="button"
                onClick={() => onSelectTitle(plan)}
                className={cn(
                  'w-full rounded-xl border px-3.5 py-3 text-left transition hover:border-coral/40 hover:bg-cream/70',
                  plan._id === activePlanId ? 'border-coral/50 bg-cream' : 'border-line bg-white'
                )}
              >
                <strong className="block text-sm text-forest underline-offset-2 hover:underline">{plan.title}</strong>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {clientName}
                  {plan.week ? ` · ${formatCalendarDate(plan.week)} – ${formatCalendarDate(plan.weekEnd)}` : ''}
                  {` · ${plan.published ? 'Published' : 'Draft'}`}
                  {` · ${plan.meals?.length ?? 0} meal${plan.meals?.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
