import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { listPlansRequest } from '@/api/plans.api';
import { useCreatePlan, useDeletePlan, useUpdatePlan } from '@/hooks/usePlans';
import { endDateFromTemplate, remapMealDay, toApiMeal, toLocalMeal } from '@/lib/planBuilder';
import { addCalendarDays, formatCalendarDate, MAX_PLAN_DAYS } from '@/lib/calendarDate';

function mealsForCopy(meals) {
  return (meals ?? []).map((meal) => toApiMeal(toLocalMeal({ ...meal, completed: false, swapRequested: false })));
}

// Apply a saved week onto any client you manage. The original reusable plan stays in the library.
export function SavedPlanDialog({ open, onOpenChange, plan, clients, onApplied, onDeleted }) {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const updatePlan = useUpdatePlan();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [week, setWeek] = useState('');
  const [weekEnd, setWeekEnd] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!open || !plan) return;
    setTitle(plan.title ?? '');
    setClientId('');
    setWeek('');
    setWeekEnd('');
    setConfirmingDelete(false);
  }, [open, plan]);

  if (!plan) return null;

  const trimmedTitle = title.trim();
  const busy = updatePlan.isPending || createPlan.isPending || deletePlan.isPending;
  const clientName = clients.find((c) => c._id === plan.client)?.name;

  async function handleReuse() {
    if (!trimmedTitle) {
      toast.error('Give this plan a title first.');
      return;
    }
    if (!clientId || !week || !weekEnd) {
      toast.error('Choose a client, start date, and end date.');
      return;
    }
    if (weekEnd < week) {
      toast.error('End date cannot be before the start date.');
      return;
    }
    const target = clients.find((c) => c._id === clientId);
    const meals = mealsForCopy(plan.meals).map((meal) => ({
      ...meal,
      day: remapMealDay(meal.day, plan.week, week),
    }));
    try {
      const existing = await listPlansRequest({ client: clientId, week });
      const current = existing?.[0];
      if (current) {
        await updatePlan.mutateAsync({
          planId: current._id,
          title: trimmedTitle,
          meals,
          week,
          weekEnd,
        });
        toast.success('Saved week applied to this client.');
        onApplied?.({ clientId, week, weekEnd, planId: current._id });
      } else {
        const created = await createPlan.mutateAsync({
          client: clientId,
          week,
          weekEnd,
          title: trimmedTitle,
          meals,
          dietitian: isAdmin ? (target?.assignedDietitian || plan.dietitian) : undefined,
        });
        toast.success('Saved week copied to this client.');
        onApplied?.({ clientId, week, weekEnd, planId: created._id });
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.error || "We couldn't reuse that plan for this client.");
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
          <DialogTitle>Reuse this weekly plan</DialogTitle>
          <DialogDescription>
            Apply these meals to any client. The saved plan stays available for the next person.
            {clientName ? ` Originally used for ${clientName}` : ''}
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
            Start date
            <Input
              type="date"
              value={week}
              onChange={(e) => {
                const next = e.target.value;
                setWeek(next);
                setWeekEnd(next ? endDateFromTemplate(next, plan) : '');
              }}
              className="mt-1.5"
            />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            End date
            <Input
              type="date"
              value={weekEnd}
              min={week || undefined}
              max={week ? addCalendarDays(week, MAX_PLAN_DAYS - 1) : undefined}
              onChange={(e) => setWeekEnd(e.target.value)}
              className="mt-1.5"
            />
          </label>

          <Button
            type="button"
            disabled={busy}
            onClick={handleReuse}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            {busy ? 'Applying…' : 'Reuse for this client'}
          </Button>

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
