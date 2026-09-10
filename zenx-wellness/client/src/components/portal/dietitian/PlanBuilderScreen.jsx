import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useClients, useDietitians } from '@/hooks/useClients';
import { useRecipes } from '@/hooks/useRecipes';
import { useClientPlans, useCreatePlan, useDeletePlan, useUpdatePlan } from '@/hooks/usePlans';
import { createBlankMeal, endOfWeek, toApiMeal, toLocalMeal } from '@/lib/planBuilder';
import { addCalendarDays, dateForMealDay, dayValueForDate, formatCalendarDate, MAX_PLAN_DAYS, planRangeDates } from '@/lib/calendarDate';
import { cn } from '@/lib/utils';
import { DayTabs } from '@/components/portal/shared/DayTabs';
import { ScheduleRow } from './ScheduleRow';
import { RecipeRail } from './RecipeRail';
import { RecipeDragPreview } from './RecipeRailCard';
import { DownloadPlanPdfButton } from '@/components/portal/shared/DownloadPlanPdfButton';
import { PublishReuseDialog } from './PublishReuseDialog';
import { PlanMealRecipeDialog } from './PlanMealRecipeDialog';
import { mealDisplayTitle } from '@/lib/planMealRecipe';

const SAVE_LABEL = { idle: '', saving: 'Saving…', saved: 'Saved', error: "Couldn't save" };

function collisionDetection(args) {
  const pointerHits = pointerWithin(args);
  return pointerHits.length ? pointerHits : rectIntersection(args);
}

function snapCenterToCursor({ activatorEvent, draggingNodeRect, transform }) {
  if (!draggingNodeRect || !activatorEvent) return transform;
  const point = activatorEvent.touches?.[0] ?? activatorEvent;
  if (point.clientX == null || point.clientY == null) return transform;
  return {
    ...transform,
    x: transform.x + (point.clientX - draggingNodeRect.left) - draggingNodeRect.width / 2,
    y: transform.y + (point.clientY - draggingNodeRect.top) - draggingNodeRect.height / 2,
  };
}

export function PlanBuilderScreen() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [searchParams] = useSearchParams();
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const clientsQuery = useClients();
  const recipesQuery = useRecipes();
  const dietitiansQuery = useDietitians(isAdmin);

  const [clientId, setClientId] = useState(() => searchParams.get('client') ?? '');
  const [week, setWeek] = useState(() => searchParams.get('week') ?? '');
  const [weekEnd, setWeekEnd] = useState(() => {
    const weekFromUrl = searchParams.get('week');
    return searchParams.get('weekEnd') || (weekFromUrl ? endOfWeek(weekFromUrl) : '');
  });
  const [title, setTitle] = useState('');
  const [meals, setMeals] = useState([]);
  const [planId, setPlanId] = useState(null);
  const [dietitianId, setDietitianId] = useState('');
  const [saveState, setSaveState] = useState('idle');
  const [publishOpen, setPublishOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);
  const [draggingRecipe, setDraggingRecipe] = useState(null);
  const [selectedDay, setSelectedDay] = useState(() => searchParams.get('week') ?? '');
  const [notifyingId, setNotifyingId] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
  const saveWaitersRef = useRef([]);
  const mealsRef = useRef(meals);
  const titleRef = useRef(title);
  const planIdRef = useRef(planId);
  const lastSavedRef = useRef({ title: '', meals: [], weekEnd: '' });
  const weekRef = useRef(week);
  const weekEndRef = useRef(weekEnd);
  const lastHydratedKeyRef = useRef(null);
  const highlightRef = useRef(null);
  const didScrollHighlightRef = useRef(false);
  mealsRef.current = meals;
  titleRef.current = title;
  weekRef.current = week;
  weekEndRef.current = weekEnd;
  const clientPlansQuery = useClientPlans(clientId || null);
  const linkedPlanId = searchParams.get('plan');
  const selectionReady = Boolean(clientId && week && weekEnd);
  const visiblePlan = useMemo(() => {
    const plans = clientPlansQuery.data ?? [];
    const linkedSelectionActive =
      linkedPlanId &&
      searchParams.get('client') === clientId &&
      searchParams.get('week') === week &&
      (!searchParams.get('weekEnd') || searchParams.get('weekEnd') === weekEnd);
    if (linkedSelectionActive) {
      const linkedPlan = plans.find((plan) => String(plan._id) === linkedPlanId);
      if (linkedPlan) return linkedPlan;
    }
    if (!selectionReady) return null;
    const exactPublished = plans.find(
      (plan) => plan.published && plan.week === week && (plan.weekEnd || plan.week) === weekEnd
    );
    if (exactPublished) return exactPublished;
    const exact = plans.find((plan) => plan.week === week && (plan.weekEnd || plan.week) === weekEnd);
    if (exact) return exact;
    return (
      plans.find(
        (plan) => plan.published && plan.week && plan.weekEnd && plan.week <= week && weekEnd <= plan.weekEnd
      ) ?? null
    );
  }, [clientPlansQuery.data, clientId, linkedPlanId, searchParams, selectionReady, week, weekEnd]);
  const isPublished = Boolean(visiblePlan?.published);
  const canDeleteDraft = Boolean(selectionReady && !isPublished && (planId || meals.length > 0 || title.trim()));
  const hasOpenSwap = meals.some((meal) => meal.swapRequested);
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

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
    if (weekFromUrl) {
      setWeek(weekFromUrl);
      setWeekEnd(searchParams.get('weekEnd') || endOfWeek(weekFromUrl));
      setSelectedDay(weekFromUrl);
    }
    didScrollHighlightRef.current = false;
  }, [searchParams]);

  // Hydrate local editable state whenever the loaded plan (or selected client/week) changes.
  // A background refetch of the SAME client/week (triggered by the save mutation's own
  // invalidateQueries) must never clobber edits made since the last successful save — only a
  // genuine switch to a different client/week re-seeds while dirty/in-flight.
  useEffect(() => {
    if (!selectionReady) {
      setPlanId(null);
      planIdRef.current = null;
      lastHydratedKeyRef.current = null;
      setTitle('');
      titleRef.current = '';
      setMeals([]);
      mealsRef.current = [];
      setDietitianId('');
      setSaveState('idle');
      return;
    }
    if (clientPlansQuery.isLoading) return;
    const selectionKey = `${clientId}|${week}|${weekEnd}|${linkedPlanId ?? ''}`;
    const isSameSelection = lastHydratedKeyRef.current === selectionKey;
    if (isSameSelection && (dirtyRef.current || saveInFlightRef.current)) return;
    lastHydratedKeyRef.current = selectionKey;
    dirtyRef.current = false;

    let nextTitle;
    let nextMeals;
    if (visiblePlan) {
      setPlanId(visiblePlan._id);
      planIdRef.current = visiblePlan._id;
      nextTitle = visiblePlan.title;
      nextMeals = visiblePlan.meals.map((meal) => {
        const local = toLocalMeal(meal);
        if (!isSameSelection) return local;
        const prev = mealsRef.current.find((m) => m.day === meal.day && m.time === meal.time);
        if (prev?.swapOriginalTitle == null && prev?.swapOriginalRecipeId === undefined && !prev?.pendingNotify) {
          return local;
        }
        return {
          ...local,
          pendingNotify: prev.pendingNotify,
          swapOriginalRecipeId: prev.swapOriginalRecipeId,
          swapOriginalCustomTitle: prev.swapOriginalCustomTitle,
          swapOriginalTitle: prev.swapOriginalTitle,
        };
      });
      setTitle(nextTitle);
      setMeals(nextMeals);
      setDietitianId(visiblePlan.dietitian ?? '');
      if (!isSameSelection) {
        const nextEnd = visiblePlan.weekEnd || endOfWeek(visiblePlan.week);
        setWeekEnd(nextEnd);
        weekEndRef.current = nextEnd;
      }
      if (visiblePlan.week && visiblePlan.week !== week) setWeek(visiblePlan.week);
    } else {
      setPlanId(null);
      planIdRef.current = null;
      nextTitle = isSameSelection ? titleRef.current.trim() : '';
      nextMeals = [];
      setTitle(nextTitle);
      setMeals(nextMeals);
      // Default to the client's own assigned dietitian, if they have one — admin can still change it.
      setDietitianId(selectedClient?.assignedDietitian ?? '');
    }
    lastSavedRef.current = { title: nextTitle, meals: nextMeals, weekEnd: weekEndRef.current };
    setSaveState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePlan, clientId, week, weekEnd, linkedPlanId, selectionReady, clientPlansQuery.isLoading]);

  // Serialized, awaited autosave: at most one PATCH/POST is ever in flight. An edit that arrives
  // while a save is already outstanding is queued (pendingSaveRef) and re-sent — with the latest
  // meals/title, read via refs — the moment the in-flight one finishes, instead of firing a second
  // overlapping request that could land at the DB out of order and silently overwrite the newer edit.
  async function save(extra = {}) {
    if (!selectionReady || (isPublished && !extra.notifySwaps)) return false;
    if (!planIdRef.current && mealsRef.current.length === 0 && extra.published !== true) {
      lastSavedRef.current = { title: titleRef.current, meals: mealsRef.current, weekEnd: weekEndRef.current };
      dirtyRef.current = false;
      setSaveState('idle');
      return true;
    }
    if (!titleRef.current.trim()) {
      toast.error('Give this plan a title first.');
      setSaveState('error');
      return false;
    }
    clearTimeout(saveTimerRef.current);

    if (saveInFlightRef.current) {
      pendingSaveRef.current = { ...(pendingSaveRef.current || {}), ...extra };
      return new Promise((resolve) => {
        saveWaitersRef.current.push(resolve);
      });
    }

    saveInFlightRef.current = true;
    setSaveState('saving');
    const payload = {
      title: titleRef.current.trim(),
      meals: mealsRef.current.map(toApiMeal),
      week: weekRef.current,
      weekEnd: weekEndRef.current,
      ...extra,
    };

    let succeeded = false;
    try {
      if (planIdRef.current) {
        await updatePlan.mutateAsync({ planId: planIdRef.current, ...payload });
      } else {
        const plan = await createPlan.mutateAsync({
          client: clientId,
          dietitian: isAdmin ? dietitianId : undefined,
          ...payload,
        });
        setPlanId(plan._id);
        planIdRef.current = plan._id;
      }
      lastSavedRef.current = { title: titleRef.current, meals: mealsRef.current, weekEnd: weekEndRef.current };
      dirtyRef.current = false;
      setSaveState('saved');
      succeeded = true;
      return true;
    } catch {
      setTitle(lastSavedRef.current.title);
      setMeals(lastSavedRef.current.meals);
      if (lastSavedRef.current.weekEnd) {
        setWeekEnd(lastSavedRef.current.weekEnd);
        weekEndRef.current = lastSavedRef.current.weekEnd;
      }
      dirtyRef.current = false;
      setSaveState('error');
      toast.error("That didn't save — your last saved version was restored.");
      return false;
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current !== null) {
        const queuedExtra = pendingSaveRef.current;
        pendingSaveRef.current = null;
        const result = await save(queuedExtra);
        saveWaitersRef.current.splice(0).forEach((resolve) => resolve(result));
      } else {
        saveWaitersRef.current.splice(0).forEach((resolve) => resolve(succeeded));
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
    if (!dirtyRef.current || needsDietitianChoice || isPublished) return;
    saveTimerRef.current = setTimeout(() => save(), 800);
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, meals, weekEnd, needsDietitianChoice]);

  function updateMeal(localId, patch) {
    markDirty(
      meals.map((m) => {
        if (m.localId !== localId) return m;
        if (
          isPublished &&
          (!m.swapRequested || Object.keys(patch).some((key) => !['recipeId', 'customTitle', 'recipeOverride'].includes(key)))
        ) {
          return m;
        }
        const recipeChanged = patch.recipeId !== undefined && patch.recipeId !== m.recipeId;
        const titleChanged = patch.customTitle !== undefined && patch.customTitle !== m.customTitle;
        const next = { ...m, ...patch };
        if (recipeChanged && patch.recipeOverride === undefined) next.recipeOverride = null;
        const hadMeal = Boolean(m.recipeId || (m.customTitle ?? '').trim());
        if ((recipeChanged || titleChanged) && hadMeal && m.swapRequested) {
          if (next.swapOriginalTitle == null) {
            next.swapOriginalRecipeId = m.recipeId;
            next.swapOriginalCustomTitle = m.customTitle ?? '';
            next.swapOriginalTitle = mealDisplayTitle(m, recipes);
          }
          const backToOriginal =
            String(next.recipeId ?? '') === String(next.swapOriginalRecipeId ?? '') &&
            (next.customTitle ?? '') === (next.swapOriginalCustomTitle ?? '');
          next.pendingNotify = !backToOriginal;
        } else if ((recipeChanged || titleChanged) && !m.swapRequested) {
          // Ordinary plan editing (including a copied reusable week) is not a swap workflow.
          // Only a request initiated by the client may expose the "Notify client" action.
          next.pendingNotify = false;
          next.swapOriginalRecipeId = undefined;
          next.swapOriginalCustomTitle = undefined;
          next.swapOriginalTitle = undefined;
        }
        return next;
      })
    );
  }

  async function notifySwap(localId) {
    const meal = mealsRef.current.find((m) => m.localId === localId);
    if (!meal?.swapRequested || !meal.pendingNotify) return;
    const recipeChanged =
      String(meal.recipeId ?? '') !== String(meal.swapOriginalRecipeId ?? '') ||
      (meal.customTitle ?? '') !== (meal.swapOriginalCustomTitle ?? '');
    if (!recipeChanged || (!meal.recipeId && !(meal.customTitle ?? '').trim())) {
      toast.error('Choose a replacement recipe first.');
      return;
    }
    const nextMeals = mealsRef.current.map((m) =>
      m.localId === localId ? { ...m, swapRequested: false, pendingNotify: false } : m
    );
    mealsRef.current = nextMeals;
    setMeals(nextMeals);
    dirtyRef.current = true;
    setNotifyingId(localId);
    const saved = await save({
      published: true,
      notifySwaps: true,
      swapResolutions: [
        {
          day: meal.day,
          time: meal.time,
          previousMeal: meal.swapOriginalTitle || mealDisplayTitle(meal, recipes),
        },
      ],
    });
    setNotifyingId(null);
    if (!saved) {
      const restored = mealsRef.current.map((m) =>
        m.localId === localId
          ? {
              ...m,
              swapRequested: meal.swapRequested,
              pendingNotify: meal.pendingNotify,
              swapOriginalRecipeId: meal.swapOriginalRecipeId,
              swapOriginalCustomTitle: meal.swapOriginalCustomTitle,
              swapOriginalTitle: meal.swapOriginalTitle,
            }
          : m
      );
      mealsRef.current = restored;
      setMeals(restored);
      return;
    }
    toast.success('Client notified by email and in the app.');
  }

  function resetBuilder() {
    clearTimeout(saveTimerRef.current);
    dirtyRef.current = false;
    pendingSaveRef.current = null;
    lastHydratedKeyRef.current = null;
    setClientId('');
    setWeek('');
    weekRef.current = '';
    setWeekEnd('');
    weekEndRef.current = '';
    setTitle('');
    titleRef.current = '';
    setMeals([]);
    mealsRef.current = [];
    setPlanId(null);
    planIdRef.current = null;
    setDietitianId('');
    setSelectedDay('');
    setSaveState('idle');
    setConfirmingDelete(false);
    navigate(`/${companySlug}/app/plan`, { replace: true });
  }

  async function deleteDraft() {
    if (isPublished) return;
    if (planIdRef.current) {
      try {
        await deletePlan.mutateAsync(planIdRef.current);
      } catch {
        toast.error("Couldn't delete that draft.");
        return;
      }
    }
    toast.success('Draft deleted.');
    resetBuilder();
  }

  function clearLinkedSelection() {
    if (searchParams.size > 0) navigate(`/${companySlug}/app/plan`, { replace: true });
  }

  const planDates = useMemo(
    () => (selectionReady ? planRangeDates(week, weekEnd) : []),
    [selectionReady, week, weekEnd]
  );
  const activeDay = planDates.includes(selectedDay) ? selectedDay : (planDates[0] ?? '');
  const activeDayValue = dayValueForDate(week, weekEnd, activeDay);
  const dayMeals = useMemo(
    () => meals.filter((meal) => dateForMealDay(week, meal.day) === activeDay),
    [meals, week, activeDay]
  );

  function addMeal() {
    if (!activeDayValue) return;
    markDirty([...meals, createBlankMeal(activeDayValue)]);
  }

  function removeMeal(localId) {
    markDirty(meals.filter((m) => m.localId !== localId));
  }

  function handleDragStart(event) {
    setDraggingRecipe(event.active.data.current?.preview ?? null);
  }

  function handleDragEnd(event) {
    setDraggingRecipe(null);
    const { active, over } = event;
    if (!over) return;
    const recipeId = active.data.current?.recipeId;
    if (!recipeId) return;
    const localId = String(over.id).replace('row-', '');
    if (isPublished && !mealsRef.current.find((meal) => meal.localId === localId)?.swapRequested) return;
    updateMeal(localId, isPublished ? { recipeId, recipeOverride: null } : { recipeId, servings: 1, recipeOverride: null });
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const highlightDay = searchParams.get('day');
  const highlightTime = searchParams.get('time');

  useEffect(() => {
    if (!highlightDay || !week) return;
    const ymd = /^\d{4}-\d{2}-\d{2}$/.test(highlightDay) ? highlightDay : dateForMealDay(week, highlightDay);
    if (ymd) setSelectedDay(ymd);
  }, [highlightDay, week]);

  useEffect(() => {
    if (didScrollHighlightRef.current || !dayMeals.length || !highlightDay) return;
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    didScrollHighlightRef.current = true;
  }, [dayMeals, highlightDay, highlightTime]);

  return (
    <div className="mx-auto max-w-6xl p-9">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground">Weekly diet schedule</p>
          <h1 className="mt-1 text-3xl text-forest">Assign a weekly diet</h1>
          <p className="mt-1 text-muted-foreground">
            Set the client, timing, and meals — then drag recipes from the library into the plan.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveState !== 'idle' && (
            <span className={saveState === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {SAVE_LABEL[saveState]}
            </span>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={`/${companySlug}/app/saved-plans`}>Saved weekly plans</Link>
          </Button>
          <DownloadPlanPdfButton planId={planId} />
          {canDeleteDraft && (
            confirmingDelete ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-forest">Delete this draft?</span>
                <button
                  type="button"
                  onClick={deleteDraft}
                  disabled={deletePlan.isPending}
                  className="font-semibold text-destructive hover:underline disabled:opacity-60"
                >
                  {deletePlan.isPending ? 'Deleting…' : 'Yes, delete'}
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
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmingDelete(true)}>
                Delete draft
              </Button>
            )
          )}
          {!isPublished && (
            <Button
              onClick={() => {
                if (!clientId) {
                  toast.error('Select a client first.');
                  return;
                }
                if (!week || !weekEnd) {
                  toast.error('Select both the start and end dates first.');
                  return;
                }
                if (meals.length === 0) {
                  toast.error('Add at least one meal first.');
                  return;
                }
                if (needsDietitianChoice) {
                  toast.error('Choose a dietitian for this plan first.');
                  return;
                }
                if (!titleRef.current.trim()) {
                  toast.error('Give this plan a title first.');
                  return;
                }
                setPublishOpen(true);
              }}
              disabled={!selectionReady || meals.length === 0 || needsDietitianChoice}
              className="rounded-full bg-coral text-white hover:bg-coral/90"
            >
              Publish weekly plan →
            </Button>
          )}
        </div>
      </div>

      {clientsQuery.isLoading || recipesQuery.isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : clients.length === 0 ? (
        <EmptyState title="No clients yet" description="Once you have a client assigned, you can build their weekly plan here." />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
          modifiers={[snapCenterToCursor]}
          measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
          autoScroll={false}
          onDragStart={handleDragStart}
          onDragCancel={() => setDraggingRecipe(null)}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-5 min-[1050px]:grid-cols-[minmax(0,1fr)_330px]">
            <section className="rounded-card bg-white p-6 shadow-soft">
              <div className={cn('grid grid-cols-1 gap-3 border-b border-line pb-5 min-[650px]:grid-cols-4', isAdmin && 'min-[900px]:grid-cols-5')}>
                <label className="block text-xs font-bold text-muted-foreground">
                  Client
                  <Select
                    value={clientId || undefined}
                    onValueChange={(nextClientId) => {
                      clearLinkedSelection();
                      setClientId(nextClientId);
                      setWeek('');
                      weekRef.current = '';
                      setWeekEnd('');
                      weekEndRef.current = '';
                      setSelectedDay('');
                    }}
                  >
                    <SelectTrigger className="mt-1.5 w-full">
                      <SelectValue placeholder="Select a client" />
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
                  Start date
                  <Input
                    type="date"
                    value={week}
                    onChange={(e) => {
                      const next = e.target.value;
                      clearLinkedSelection();
                      setWeek(next);
                      setSelectedDay('');
                      setWeekEnd('');
                      weekEndRef.current = '';
                    }}
                    className="mt-1.5"
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  End date
                  <Input
                    type="date"
                    value={weekEnd}
                    min={week}
                    max={week ? addCalendarDays(week, MAX_PLAN_DAYS - 1) : undefined}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (!next || next < week) return;
                      clearLinkedSelection();
                      setWeekEnd(next);
                      weekEndRef.current = next;
                      setSelectedDay(week);
                    }}
                    className="mt-1.5"
                  />
                </label>
                <label className="block text-xs font-bold text-muted-foreground">
                  Plan title
                  <Input
                    value={title}
                    onChange={(e) => {
                      if (isPublished) return;
                      dirtyRef.current = true;
                      setTitle(e.target.value);
                    }}
                    readOnly={isPublished}
                    className="mt-1.5"
                    placeholder="e.g. High-protein week"
                  />
                  {isPublished ? (
                    <span className="mt-1.5 inline-flex rounded-full bg-sage px-2 py-0.5 text-[11px] font-semibold text-forest">
                      Published
                    </span>
                  ) : null}
                </label>
              </div>

              {planDates.length > 0 && (
                <div className="border-b border-line py-4">
                  <DayTabs weekStart={week} weekEnd={weekEnd} selectedDay={activeDay} onSelect={setSelectedDay} />
                </div>
              )}

              <div className="flex items-center justify-between py-4">
                <div>
                  <h2 className="text-xl">
                    {activeDay
                      ? `Meals for ${formatCalendarDate(activeDay, { weekday: 'long', day: 'numeric', month: 'short' })}`
                      : 'Meal schedule'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {!selectionReady
                      ? 'Select a client, start date, and end date to load or create a meal plan.'
                      : isPublished
                      ? hasOpenSwap
                        ? 'This weekly diet is already published. Only meals with a client swap request can be changed and notified.'
                        : 'This weekly diet is already published and cannot be edited.'
                      : 'Pick a day, then drag a recipe onto a meal slot or choose one from the dropdown.'}
                  </p>
                </div>
                {!isPublished && (
                  <button
                    type="button"
                    onClick={addMeal}
                    disabled={!selectionReady || !activeDay}
                    className="text-sm font-semibold text-forest hover:underline disabled:text-dim disabled:no-underline"
                  >
                    + Add meal
                  </button>
                )}
              </div>

              {!selectionReady ? (
                <p className="py-10 text-center text-sm text-dim">
                  Select a client, start date, and end date to show the meal schedule.
                </p>
              ) : clientPlansQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : dayMeals.length === 0 ? (
                <p className="py-10 text-center text-sm text-dim">
                  {meals.length === 0
                    ? 'No meals yet. Add a meal to assign recipes for this day.'
                    : 'No meals on this day. Add a meal or pick another day.'}
                </p>
              ) : (
                <div className="grid gap-2">
                  {dayMeals.map((meal) => {
                    const highlighted = Boolean(
                      highlightDay &&
                        highlightTime &&
                        meal.time === highlightTime &&
                        (meal.day === highlightDay || dateForMealDay(week, meal.day) === highlightDay)
                    );
                    return (
                      <ScheduleRow
                        key={meal.localId}
                        ref={highlighted ? highlightRef : undefined}
                        meal={meal}
                        recipes={recipes}
                        weekStart={week}
                        weekEnd={weekEnd}
                        highlighted={highlighted}
                        onChange={(patch) => updateMeal(meal.localId, patch)}
                        onRemove={() => removeMeal(meal.localId)}
                        onNotifySwap={() => notifySwap(meal.localId)}
                        onEditRecipe={() => {
                          if (isPublished && !meal.swapRequested) return;
                          setEditingMealId(meal.localId);
                        }}
                        notifyPending={notifyingId === meal.localId}
                        readOnly={isPublished}
                        allowRecipeSwap={isPublished && meal.swapRequested}
                        dayLocked
                      />
                    );
                  })}
                </div>
              )}
            </section>

            {(!isPublished || hasOpenSwap) && <RecipeRail recipes={recipes} client={selectedClient} />}
          </div>
          <DragOverlay modifiers={[snapCenterToCursor]} dropAnimation={null} zIndex={80}>
            {draggingRecipe ? <RecipeDragPreview recipe={draggingRecipe} className="cursor-grabbing" /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <PublishReuseDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        pending={saveState === 'saving'}
        onChoose={async (reusable) => {
          const saved = await save({ published: true, reusable });
          if (!saved) return;
          setPublishOpen(false);
          toast.success(
            reusable
              ? 'Weekly plan published and saved for reuse.'
              : 'Weekly plan published — your client can now see it.'
          );
          resetBuilder();
        }}
      />

      <PlanMealRecipeDialog
        open={Boolean(editingMealId)}
        onOpenChange={(open) => {
          if (!open) setEditingMealId(null);
        }}
        recipe={recipes.find((recipe) => recipe._id === meals.find((meal) => meal.localId === editingMealId)?.recipeId) ?? null}
        override={meals.find((meal) => meal.localId === editingMealId)?.recipeOverride}
        onSave={(recipeOverride) => {
          if (!editingMealId) return;
          updateMeal(editingMealId, { recipeOverride });
          setEditingMealId(null);
          toast.success('Saved on this weekly plan — recipe library unchanged.');
        }}
      />
    </div>
  );
}
