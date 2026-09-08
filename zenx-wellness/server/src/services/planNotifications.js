import { findUserById } from '../models/User.js';
import { formatCalendarDate, dateForWeekdaySlot } from '../utils/calendarDate.js';
import { sendEmail } from '../emails/sendEmail.js';
import { canNotifyUser } from './notifyGuard.js';
import { portalPathUrl } from '../utils/urls.js';
import { notifyUserPush } from './pushNotifications.js';

// `plan.title` here is the weekly/monthly diet Plan's own name (e.g. "Weekly nourish plan") — a
// different entity from accountNotifications.js's `plan_name` (the client's programPlan, e.g.
// "Weight Loss"). Both templates happen to use the same `{{plan_name}}` token; each is filled from
// whichever "plan" that specific email is actually about.
export async function notifyPlanPublished(plan) {
  try {
    const client = await findUserById(plan.client?._id ?? plan.client);
    if (!canNotifyUser(client)) return;
    const dietitian = await findUserById(plan.dietitian?._id ?? plan.dietitian).catch(() => null);

    await sendEmail(
      client.email,
      'plan-published',
      {
        client_name: client.name,
        dietitian_name: dietitian?.name ?? 'Your dietitian',
        plan_name: plan.title,
        week_range: `${formatCalendarDate(plan.week)} – ${formatCalendarDate(plan.weekEnd)}`,
        login_url: portalPathUrl(client, '/app/meals'),
        planId: plan.id,
      },
      // No revision counter (unlike calls' icsSequence) — an un-publish/re-publish of the same
      // plan isn't a supported flow today (there's no "Unpublish" action in the UI), so keying
      // purely on plan.id is the simple, correct choice for now. If that ever becomes a real flow,
      // this needs the same kind of counter calls already have.
      { idempotencyKey: `plan-published:${plan.id}`, relatedEntity: { type: 'client', id: client.id } }
    );
  } catch (err) {
    console.error(`[notifications] failed to queue plan-published email for plan ${plan.id}:`, err);
  }
}

export async function notifyMealSwapRequested(plan, mealIndex) {
  try {
    const meal = plan.meals?.[mealIndex];
    if (!meal) return;
    const dietitian = await findUserById(plan.dietitian?._id ?? plan.dietitian);
    if (!canNotifyUser(dietitian)) return;
    const clientId = plan.client?._id ?? plan.client;
    const client = await findUserById(clientId).catch(() => null);
    const mealTitle = meal.recipe?.title ?? meal.customTitle ?? meal.mealType;
    const mealWhen = `${meal.day} · ${meal.time}`;
    const loginUrl = portalPathUrl(dietitian, `/app/clients/${clientId}`);

    await sendEmail(
      dietitian.email,
      'meal-swap-requested',
      {
        dietitian_name: dietitian.name,
        client_name: client?.name ?? 'Your client',
        meal_title: mealTitle,
        meal_type: meal.mealType,
        meal_when: mealWhen,
        login_url: loginUrl,
      },
      // Each rising-edge request is a new event — clients can cancel and ask again after a swap.
      { idempotencyKey: `meal-swap:${plan.id}:${mealIndex}:${Date.now()}`, relatedEntity: { type: 'client', id: clientId } }
    );

    await notifyUserPush(dietitian.id, {
      title: `${client?.name ?? 'A client'} requested a meal swap`,
      body: `${mealTitle} (${mealWhen})`,
      url: loginUrl,
    });
  } catch (err) {
    console.error(`[notifications] failed to queue meal-swap-requested email for plan ${plan.id}:`, err);
  }
}

function mealTitle(meal) {
  return meal?.recipe?.title ?? meal?.customTitle ?? meal?.mealType ?? 'meal';
}

function mealWhen(plan, meal) {
  const date = dateForWeekdaySlot(plan.week, meal.day);
  const dateLabel = date
    ? formatCalendarDate(date, { weekday: 'short', day: 'numeric', month: 'short' })
    : meal.day;
  return `${dateLabel} · ${meal.time}`;
}

function sameSlot(a, b) {
  return a.day === b.day && a.time === b.time;
}

export async function notifyResolvedSwaps(before, after, resolutions = []) {
  const resolved = (before.meals ?? []).filter((meal) => meal.swapRequested);
  for (const previous of resolved) {
    const next = (after.meals ?? []).find((meal) => sameSlot(meal, previous)) ?? previous;
    const note = resolutions.find((r) => r.day === previous.day && r.time === previous.time);
    await notifyMealSwapFulfilled(after, previous, next, note?.previousMeal);
  }
}

export async function notifyMealSwapFulfilled(plan, previousMeal, nextMeal, previousTitleOverride) {
  try {
    const client = await findUserById(plan.client?._id ?? plan.client);
    if (!canNotifyUser(client)) return;
    const dietitian = await findUserById(plan.dietitian?._id ?? plan.dietitian).catch(() => null);
    const loginUrl = portalPathUrl(client, '/app/meals');
    const previousTitle = previousTitleOverride || mealTitle(previousMeal);
    const newTitle = mealTitle(nextMeal);
    const when = mealWhen(plan, nextMeal);

    await sendEmail(
      client.email,
      'meal-swap-fulfilled',
      {
        client_name: client.name,
        dietitian_name: dietitian?.name ?? 'Your dietitian',
        previous_meal: previousTitle,
        new_meal: newTitle,
        meal_type: nextMeal.mealType ?? previousMeal.mealType,
        meal_when: when,
        login_url: loginUrl,
      },
      { idempotencyKey: `meal-swap-fulfilled:${plan.id}:${previousMeal.day}:${previousMeal.time}:${Date.now()}`, relatedEntity: { type: 'client', id: client.id } }
    );

    await notifyUserPush(client.id, {
      title: 'Your meal has been swapped',
      body: `${previousTitle} is now ${newTitle} (${when})`,
      url: loginUrl,
    });
  } catch (err) {
    console.error(`[notifications] failed to queue meal-swap-fulfilled email for plan ${plan.id}:`, err);
  }
}
