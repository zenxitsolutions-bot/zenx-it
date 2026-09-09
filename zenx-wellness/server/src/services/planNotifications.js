import { findUserById } from '../models/User.js';
import { formatCalendarDate, dateForWeekdaySlot } from '../utils/calendarDate.js';
import { sendEmail } from '../emails/sendEmail.js';
import { canNotifyUser } from './notifyGuard.js';
import { portalPathUrl } from '../utils/urls.js';
import { notifyUserPush } from './pushNotifications.js';
import { channels } from '../notifications/channels/index.js';
import { ApiError } from '../utils/ApiError.js';

export function requestedSwapResolutions(meals = [], resolutions) {
  const requestedMeals = meals.filter((meal) => meal.swapRequested);
  if (!requestedMeals.length) {
    throw ApiError.badRequest('A client swap request is required before notifying the client');
  }

  const requestedSlots = new Set(requestedMeals.map((meal) => `${meal.day}|${meal.time}`));
  const selected =
    resolutions?.length
      ? resolutions
      : requestedMeals.map((meal) => ({ day: meal.day, time: meal.time }));
  const invalidResolution = selected.find(
    (note) => !requestedSlots.has(`${note.day}|${note.time}`)
  );
  if (invalidResolution) {
    throw ApiError.badRequest('The selected meal does not have an active client swap request');
  }
  return selected;
}

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

    const title = `${client?.name ?? 'A client'} requested a meal swap`;
    const body = `${mealTitle} (${mealWhen})`;
    await channels.inApp.send({
      userId: dietitian.id,
      type: 'meal-swap-requested',
      title,
      body,
      url: `/app/clients/${clientId}`,
    });
    await notifyUserPush(dietitian.id, { title, body, url: loginUrl });
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
  const notes = (resolutions ?? []).length
    ? resolutions
    : (before.meals ?? [])
        .filter((meal) => meal.swapRequested)
        .map((meal) => ({ day: meal.day, time: meal.time, previousMeal: mealTitle(meal) }));

  for (const note of notes) {
    const previous = (before.meals ?? []).find((meal) => sameSlot(meal, note)) ?? note;
    const next = (after.meals ?? []).find((meal) => sameSlot(meal, note)) ?? previous;
    await notifyMealSwapFulfilled(after, previous, next, note.previousMeal);
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

    const title = 'Your meal has been swapped';
    const body = `${previousTitle} is now ${newTitle} (${when})`;
    await channels.inApp.send({
      userId: client.id,
      type: 'meal-swap',
      title,
      body,
      url: '/app/meals',
    });
    await notifyUserPush(client.id, { title, body, url: loginUrl });
  } catch (err) {
    console.error(`[notifications] failed to queue meal-swap-fulfilled email for plan ${plan.id}:`, err);
  }
}
