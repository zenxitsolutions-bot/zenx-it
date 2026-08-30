import { format } from 'date-fns';
import { findUserById } from '../models/User.js';
import { sendEmail } from '../emails/sendEmail.js';
import { env } from '../config/env.js';

// `plan.title` here is the weekly/monthly diet Plan's own name (e.g. "Weekly nourish plan") — a
// different entity from accountNotifications.js's `plan_name` (the client's programPlan, e.g.
// "Weight Loss"). Both templates happen to use the same `{{plan_name}}` token; each is filled from
// whichever "plan" that specific email is actually about.
export async function notifyPlanPublished(plan) {
  try {
    const client = await findUserById(plan.client?._id ?? plan.client);
    if (!client) return;
    const dietitian = await findUserById(plan.dietitian?._id ?? plan.dietitian).catch(() => null);

    await sendEmail(
      client.email,
      'plan-published',
      {
        client_name: client.name,
        dietitian_name: dietitian?.name ?? 'Your dietitian',
        plan_name: plan.title,
        week_range: `${format(plan.week, 'd MMM yyyy')} – ${format(plan.weekEnd, 'd MMM yyyy')}`,
        login_url: `${env.clientOrigin}/app/meals`,
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
