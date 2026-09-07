import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useClients, useDietitians } from '@/hooks/useClients';
import { useRecipes } from '@/hooks/useRecipes';
import { useCreatePlan, usePlanForWeek, useUpdatePlan } from '@/hooks/usePlans';
import { createBlankMeal, defaultWeekStart, endOfWeek, toApiMeal, toLocalMeal } from '@/lib/planBuilder';
import { cn } from '@/lib/utils';
import { ScheduleRow } from './ScheduleRow';
import { RecipeRail } from './RecipeRail';
import { DownloadPlanPdfButton } from '@/components/portal/shared/DownloadPlanPdfButton';

const SAVE_LABEL = { idle: '', saving: 'Saving…', saved: 'Saved', error: "Couldn't save" };

export function PlanBuilderScreen() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [searchParams] = useSearchParams();
  const clientsQuery = useClients();
  const recipesQuery = useRecipes();
  const dietitiansQuery = useDietitians(isAdmin);

  const [clientId, setClientId] = useState(() => searchParams.get('client') ?? '');
  const [week, setWeek] = useState(() => searchParams.get('week') || defaultWeekStart());
  const [title, setTitle] = useState('');
  const [meals, setMeals] = useState([]);
  const [planId, setPlanId] = useState(null);
  const [dietitianId, setDietitianId] = useState('');
  const [saveState, setSaveState] = useState('idle');

  const dirtyRef = useRef(false);
  const saveTimerRef = useRef(null);
  // Guards against the autosave race where the old value reappears: saveInFlightRef/pendingSaveRef
  // serialize saves so at most one PATCH is ever outstanding (a second edit during an in-flight
  // save queues a follow-up instead of firing an overlapping request); mealsRef/titleRef/planIdRef
  // mirror state so an async save always reads the truly-latest values, not a stale closure;
  // lastSavedRef is the rollback target on failure; lastHydratedKeyRef distinguishes "the same
  // plan query re-resolved in the background" (must not clobber in-progress edits) from "the user
  // switched client/week" (must re-seed regardless of dirty state).
  const saveInFlightRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const mealsRef = useRef(meals);
  const titleRef = useRef(title);
  const planIdRef = useRef(planId);
  const lastSavedRef = useRef({ title: '', meals: [] });
  const lastHydratedKeyRef = useRef(null);
  const highlightRef = useRef(null);
  const didScrollHighlightRef = useRef(false);
  mealsRef.current = meals;
  titleRef.current = title;
  const planQuery = usePlanForWeek(clientId || null, week);
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const clients = clientsQuery.data ?? [];
  const recipes = recipesQuery.data ?? [];
  const selectedClient = clients.find((c) => c._id === clientId);
  // Admin must pick a dietitian to author a brand-new plan as (the server derives it
  // automatically for a dietitian caller, but requires it explicitly from admin — see
  // plan.controller.js#createPlan). Once a plan exists its dietitian is fixed, not editable here.
  const needsDietitianChoice = isAdmin && !planId && !dietitianId;

  // Review from the dashboard names a client/week in the URL. Apply once per URL change so
  // the dietitian can still switch client afterwards without being yanked back.
  useEffect(() => {
    const fromUrl = searchParams.get('client');
    const weekFromUrl = searchParams.get('week');
    if (fromUrl) setClientId(fromUrl);
    if (weekFromUrl) setWeek(weekFromUrl);
    didScrollHighlightRef.current = false;
  }, [searchParams]);

  // Default to the first client once the list loads. Depends on clientsQuery.data (a stable
  // reference from React Query) rather than the `clients` fallback array, which is a fresh `[]`
  // literal every render while loading and would otherwise re-trigger this on every render.
  useEffect(() => {
    if (searchParams.get('client')) return;
    if (!clientId && clientsQuery.data?.length > 0) setClientId(clientsQuery.data[0]._id);
  }, [clientId, clientsQuery.data, searchParams]);

  // Hydrate local editable state whenever the loaded plan (or selected client/week) changes.
  // A background refetch of the SAME client/week (triggered by the save mutation's own
  // invalidateQueries) must never clobber edits made since the last successful save — only a
  // genuine switch to a different client/week re-seeds while dirty/in-flight.
  useEffect(() => {
    if (planQuery.isLoading || !clientId) return;
    const selectionKey = `${clientId}|${week}`;
    const isSameSelection = lastHydratedKeyRef.current === selectionKey;
    if (isSameSelection && (dirtyRef.current || saveInFlightRef.current)) return;
    lastHydratedKeyRef.current = selectionKey;
    dirtyRef.current = false;

    let nextTitle;
    let nextMeals;
    if (planQuery.plan) {
      setPlanId(planQuery.plan._id);
      planIdRef.current = planQuery.plan._id;
      nextTitle = planQuery.plan.title;
      nextMeals = planQuery.plan.meals.map((meal) => {
        const local = toLocalMeal(meal);
        if (!isSameSelection) return local;
        const prev = mealsRef.current.find((m) => m.day === meal.day && m.time === meal.time);
        if (prev?.swapOriginalTitle == null && prev?.swapOriginalRecipeId === undefined) return local;
        return {
          ...local,
          swapOriginalRecipeId: prev.swapOriginalRecipeId,
          swapOriginalCustomTitle: prev.swapOriginalCustomTitle,
          swapOriginalTitle: prev.swapOriginalTitle,
        };
      });
      setTitle(nextTitle);
      setMeals(nextMeals);
      setDietitianId(planQuery.plan.dietitian ?? '');
    } else {
      setPlanId(null);
      planIdRef.current = null;
      nextTitle = selectedClient ? `${selectedClient.name}'s weekly nourish plan` : 'Weekly nourish plan';
      nextMeals = [createBlankMeal()];
      setTitle(nextTitle);
      setMeals(nextMeals);
      // Default to the client's own assigned dietitian, if they have one — admin can still change it.
      setDietitianId(selectedClient?.assignedDietitian ?? '');
    }
    lastSavedRef.current = { title: nextTitle, meals: nextMeals };
    setSaveState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planQuery.plan, clientId, week]);

  // Serialized, awaited autosave: at most one PATCH/POST is ever in flight. An edit that arrives
  // while a save is already outstanding is queued (pendingSaveRef) and re-sent — with the latest
  // meals/title, read via refs — the moment the in-flight one finishes, instead of firing a second
  // overlapping request that could land at the DB out of order and silently overwrite the newer edit.
  async function save(extra = {}) {
    if (!clientId) return false;
    clearTimeout(saveTimerRef.current);

    if (saveInFlightRef.current) {
      pendingSaveRef.current = extra;
      return false;
    }

    saveInFlightRef.current = true;
    setSaveState('saving');
    const payload = { title: titleRef.current, meals: mealsRef.current.map(toApiMeal), ...extra };

    try {
      if (planIdRef.current) {
        await updatePlan.mutateAsync({ planId: planIdRef.current, ...payload });
      } else {
        const plan = await createPlan.mutateAsync({
          client: clientId,
          week,
          weekEnd: endOfWeek(week),
          dietitian: isAdmin ? dietitianId : undefined,
          ...payload,
        });
        setPlanId(plan._id);
        planIdRef.current = plan._id;
      }
      lastSavedRef.current = { title: titleRef.current, meals: mealsRef.current };
      dirtyRef.current = false;
      setSaveState('saved');
      return true;
    } catch {
      setTitle(lastSavedRef.current.title);
      setMeals(lastSavedRef.current.meals);
      dirtyRef.current = false;
      setSaveState('error');
      toast.error("That didn't save — your last saved version was restored.");
      return false;
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current !== null) {
        const queuedExtra = pendingSaveRef.current;
        pendingSaveRef.current = null;
        save(queuedExtra);
      }
    }
  }

  function markDirty(nextMeals) {
    dirtyRef.current = true;
    setMeals(nextMeals);
  }

  // Autosave: debounce 800ms after the last edit. Skipped (silently, not an error toast) while
  // admin hasn't picked a dietitian yet for a brand-new plan — save() would 400 without one.
  useEffect(() => {
    if (!dirtyRef.current || needsDietitianChoice) return;
    saveTimerRef.current = setTimeout(() => save(), 800);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, meals, needsDietitianChoice]);

  function updateMeal(localId, patch) {
    markDirty(meals.map((m) => (m.localId === localId ? { ...m, ...patch } : m)));
  }

  async function notifySwap(localId) {
    const meal = mealsRef.current.find((m) => m.localId === localId);
    if (!meal) return;
    if (!meal.recipeId && !(meal.customTitle ?? '').trim()) {
      toast.error('Choose a replacement recipe first.');
      return;
    }
    const nextMeals = mealsRef.current.map((m) => (m.localId === localId ? { ...m, swapRequested: false } : m));
    mealsRef.current = nextMeals;
    setMeals(nextMeals);
    dirtyRef.current = true;
    const saved = await save({
      notifySwaps: true,
      swapResolutions: [
        {
          day: meal.day,
          time: meal.time,
          previousMeal: meal.swapOriginalTitle || meal.customTitle || meal.mealType,
        },
      ],
    });
    if (saved) toast.success('Client notified of the swap.');
  }

  function addMeal() {
    markDirty([...meals, createBlankMeal()]);
  }

  function removeMeal(localId) {
    markDirty(meals.filter((m) => m.localId !== localId));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const recipe = active.data.current?.recipe;
    if (!recipe) return;
    const localId = String(over.id).replace('row-', '');
    updateMeal(localId, { recipeId: recipe._id });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const highlightDay = searchParams.get('day');
  const highlightTime = searchParams.get('time');

  useEffect(() => {
    if (didScrollHighlightRef.current || !meals.length || !highlightDay) return;
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    didScrollHighlightRef.current = true;
  }, [meals, highlightDay, highlightTime]);

  return (
    <div className="mx-auto max-w-6xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Weekly diet schedule</p>
          <h1 className="mt-1 text-3xl text-forest">Assign a weekly diet</h1>
          <p className="mt-1 text-muted-foreground">Set the client, timing, and meals — then drag recipes from the library into the plan.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveState !== 'idle' && (
            <span className={saveState === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {SAVE_LABEL[saveState]}
            </span>
          )}
          <DownloadPlanPdfButton planId={planId} />
          <Button
            onClick={() => {
              if (meals.length === 0) {
                toast.error('Add at least one meal first.');
                return;
              }
              if (needsDietitianChoice) {
                toast.error('Choose a dietitian for this plan first.');
                return;
              }
              save({ published: true });
              toast.success("Weekly plan published — your client can now see it.");
            }}
            disabled={!clientId || meals.length === 0 || needsDietitianChoice}
            className="rounded-full bg-coral text-white hover:bg-coral/90"
          >
            Publish weekly plan →
          </Button>
        </div>
      </div>

      {clientsQuery.isLoading || recipesQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Once you have a client assigned, you can build their weekly plan here." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="grid gap-5 min-[1050px]:grid-cols-[minmax(0,1fr)_330px]">
            <section className="rounded-card bg-white p-6 shadow-soft">
              <div className={cn('grid grid-cols-1 gap-3 border-b border-line pb-5 min-[650px]:grid-cols-4', isAdmin && 'min-[900px]:grid-cols-5')}>
                <label className="block text-xs font-bold text-muted-foreground">
                  Client
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue />
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
                {isAdmin && (
                  <label className="block text-xs font-bold text-muted-foreground">
                    Dietitian
                    <Select value={dietitianId} onValueChange={setDietitianId} disabled={Boolean(planId)}>
                      <SelectTrigger className="mt-1.5 w-full">
                        <SelectValue placeholder="Choose a dietitian" />
                      </SelectTrigger>
                      <SelectContent>
                        {(dietitiansQuery.data ?? []).map((d) => (
                          <SelectItem key={d._id} value={d._id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                )}
                <label className="block text-xs font-bold text-muted-foreground">
                  Week start date
                  <Input type="date" value={week} onChange={(e) => setWeek(e.target.value)} className="mt-1.5" />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  Week end date
                  <Input type="date" value={endOfWeek(week)} disabled className="mt-1.5" />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  Plan title
                  <Input
                    value={title}
                    onChange={(e) => {
                      dirtyRef.current = true;
                      setTitle(e.target.value);
                    }}
                    className="mt-1.5"
                  />
                </label>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <h2 className="text-xl">Meal schedule</h2>
                  <p className="text-xs text-muted-foreground">
                    Drag a recipe onto any meal slot, choose one from the dropdown, or set the meal type to Custom to type your own.
                  </p>
                </div>
                <button type="button" onClick={addMeal} className="text-sm font-semibold text-forest hover:underline">
                  + Add meal
                </button>
              </div>

              {planQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="grid gap-2">
                  {meals.map((meal) => {
                    const highlighted = Boolean(
                      highlightDay && highlightTime && meal.day === highlightDay && meal.time === highlightTime
                    );
                    return (
                      <ScheduleRow
                        key={meal.localId}
                        ref={highlighted ? highlightRef : undefined}
                        meal={meal}
                        recipes={recipes}
                        weekStart={week}
                        highlighted={highlighted}
                        onChange={(patch) => updateMeal(meal.localId, patch)}
                        onRemove={() => removeMeal(meal.localId)}
                        onNotifySwap={() => notifySwap(meal.localId)}
                        notifyPending={updatePlan.isPending}
                      />
                    );
                  })}
                </div>
              )}
            </section>

            <RecipeRail recipes={recipes} />
          </div>
        </DndContext>
      )}
    </div>
  );
}
