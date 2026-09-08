import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCreatePlan, useDeletePlan, useUpdatePlan } from '@/hooks/usePlans';
import { endOfWeek, toApiMeal, toLocalMeal } from '@/lib/planBuilder';
import { formatCalendarDate } from '@/lib/calendarDate';

function mealsForCopy(meals) {
  return (meals ?? []).map((meal) => toApiMeal(toLocalMeal({ ...meal, completed: false, swapRequested: false })));
}

// Click a saved weekly plan title to rename it, move the week, assign it to a client, copy it
// onto someone else (leaving the original), or delete it.
export function SavedPlanDialog({ open, onOpenChange, plan, clients, onApplied, onDeleted }) {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const updatePlan = useUpdatePlan();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [week, setWeek] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open || !plan) return;
    setTitle(plan.title ?? '');
    setClientId(plan.client ?? '');
    setWeek(plan.week ?? '');
    setConfirmingDelete(false);
  }, [open, plan]);

  if (!plan) return null;

  const trimmedTitle = title.trim();
  const busy = updatePlan.isPending || createPlan.isPending || deletePlan.isPending;
  const clientName = clients.find((c) => c._id === plan.client)?.name;

  async function handleReassign() {
    if (!trimmedTitle) {
      toast.error('Give this plan a title first.');
      return;
    }
    if (!clientId || !week) {
      toast.error('Choose a client and week start date.');
      return;
    }
    try {
      await updatePlan.mutateAsync({
        planId: plan._id,
        title: trimmedTitle,
        client: clientId,
        week,
        weekEnd: endOfWeek(week),
      });
      toast.success('Plan assigned.');
      onApplied?.({ clientId, week, planId: plan._id });
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "We couldn't update that plan.");
    }
  }

  async function handleReuse() {
    if (!trimmedTitle) {
      toast.error('Give this plan a title first.');
      return;
    }
    if (!clientId || !week) {
      toast.error('Choose a client and week start date.');
      return;
    }
    try {
      const created = await createPlan.mutateAsync({
        client: clientId,
        week,
        weekEnd: endOfWeek(week),
        title: trimmedTitle,
        meals: mealsForCopy(plan.meals),
        dietitian: isAdmin ? plan.dietitian : undefined,
      });
      toast.success('Plan copied to this client.');
      onApplied?.({ clientId, week, planId: created._id });
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "We couldn't copy that plan.");
    }
  }

  async function handleDelete() {
    try {
      await deletePlan.mutateAsync(plan._id);
      toast.success('Plan deleted.');
      onDeleted?.(plan._id);
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "We couldn't delete that plan.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign this weekly plan</DialogTitle>
          <DialogDescription>
            {clientName ? `Saved for ${clientName}` : 'Saved weekly plan'}
            {plan.week ? ` · week of ${formatCalendarDate(plan.week)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <label className="block text-xs font-bold text-muted-foreground">
            Plan title
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            Assign to client
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1.5 w-full">
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            Week start date
            <Input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="mt-1.5" />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            Week end date
            <Input type="date" value={week ? endOfWeek(week) : ''} disabled className="mt-1.5" />
          </label>

          <div className="grid gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={handleReassign}
              className="rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {updatePlan.isPending ? 'Saving…' : 'Save & assign'}
            </Button>
            <Button type="button" variant="outline" disabled={busy} onClick={handleReuse}>
              {createPlan.isPending ? 'Copying…' : 'Reuse as a new plan'}
            </Button>
          </div>

          {confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-forest">Delete this weekly plan?</span>
              <button type="button" onClick={handleDelete} className="font-semibold text-destructive hover:underline">
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="text-muted-foreground hover:underline"
              >
                Never mind
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmingDelete(true)}
              className="justify-self-start text-sm font-semibold text-destructive hover:underline"
            >
              Delete plan
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
