import { useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentPlan } from '@/hooks/usePlans';
import { useDietitians } from '@/hooks/useClients';
import { useUpdateUser } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { formatCalendarDate } from '@/lib/calendarDate';
import { formatDate } from '@/lib/format';
import { ClientContactEditDialog } from './ClientContactEditDialog';

// Spec §6 item 1: client information, plan, and plan duration — plus a quick pointer at the
// current weekly meal plan (full history of those lives in the Meal plans tab). Spec
// §2026-round2-fixes item 3: email/phone are editable here too — the same allowlisted
// {email, phone}-only path an admin's edit dialog uses, restricted server-side to a client
// actually assigned to the calling dietitian (see user.controller.js#updateUser).
export function ClientOverviewTab({ client }) {
  const planQuery = useCurrentPlan(client._id);
  const [editingContact, setEditingContact] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: dietitians } = useDietitians(isAdmin);
  const updateUser = useUpdateUser();
  const activeDietitians = (dietitians ?? []).filter((d) => !d.accountStatus || d.accountStatus === 'active');
  const currentDietitian = (dietitians ?? []).find((d) => d._id === client.assignedDietitian);

  function handleDietitianChange(value) {
    updateUser.mutate(
      { userId: client._id, assignedDietitian: value === 'none' ? null : value },
      {
        onSuccess: () => toast.success('Dietitian updated.'),
        onError: () => toast.error("We couldn't update the dietitian — please try again."),
      }
    );
  }

  return (
    <div className="grid gap-5 min-[700px]:grid-cols-2">
      <section className="rounded-card bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Client information</h2>
          <button type="button" onClick={() => setEditingContact(true)} className="text-sm font-semibold text-forest hover:underline">
            Edit
          </button>
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="text-forest">{client.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Phone</dt>
            <dd className="text-forest">{client.phone || '—'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Client since</dt>
            <dd className="text-forest">{formatDate(client.createdAt)}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Dietitian</dt>
            <dd className="text-forest">
              {isAdmin ? (
                <Select
                  value={client.assignedDietitian ?? 'none'}
                  onValueChange={handleDietitianChange}
                  disabled={updateUser.isPending}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {activeDietitians.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                currentDietitian?.name || user?.name || '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card bg-white p-6 shadow-soft">
        <h2 className="text-xl">Plan</h2>
        <div className="mt-4 rounded-xl bg-cream p-3">
          <strong className="block text-sm text-forest">{client.programPlan?.name ?? 'No plan assigned'}</strong>
          {client.planDuration && <span className="text-xs text-muted-foreground">{client.planDuration}</span>}
        </div>
      </section>

      <section className="rounded-card bg-white p-6 shadow-soft min-[700px]:col-span-2">
        <h2 className="text-xl">Current weekly meal plan</h2>
        {planQuery.isLoading ? (
          <Skeleton className="mt-4 h-14 w-full" />
        ) : planQuery.plan ? (
          <div className="mt-4 rounded-xl bg-cream p-3">
            <strong className="block text-sm text-forest">{planQuery.plan.title}</strong>
            <span className="text-xs text-muted-foreground">
              Week of {formatCalendarDate(planQuery.plan.week, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {planQuery.plan.published ? 'Published' : 'Draft'} ·{' '}
              {planQuery.plan.meals.length} meal{planQuery.plan.meals.length === 1 ? '' : 's'}
            </span>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No weekly plan assigned yet.</p>
        )}
      </section>

      <ClientContactEditDialog open={editingContact} onOpenChange={setEditingContact} client={client} />
    </div>
  );
}
