import { countEnquiries, countEnquiriesByStatus, listEnquiryCreatedAtSince } from '../models/Enquiry.js';
import {
  countUsers,
  listUsers,
  countUsersGroupedByDietitian,
  listClientIdsByDietitian,
  countClientsCreatedBetween,
} from '../models/User.js';
import { countCalls, listCallsForDietitianInRange } from '../models/Call.js';
import { countPlanStatesForDietitian, countPublishedPlansCreatedBetween } from '../models/Plan.js';
import { countProgressByDayForClients, latestProgressByClientIds } from '../models/Progress.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { toClientShape } from '../utils/serialize.js';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

const ENQUIRY_STATUSES = ['new', 'contacted', 'follow-up', 'converted', 'closed'];
const GROWTH_WEEKS = 8;

// UTC-based deliberately — see the matching fix + comment in client/src/lib/planBuilder.js and
// server/src/seed.js. A local-time version of this silently produced a timestamp offset from
// true UTC midnight by the server's UTC offset, so every week bucket missed the intended boundary
// and the whole chart read zero — caught by testing live with real data, not by reading the code.
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
}

export const adminOverview = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId;
  const [newEnquiries, converted, totalEnquiries, activeClients, dietitians, statusCounts] = await Promise.all([
    countEnquiries({ companyId, status: 'new' }),
    countEnquiries({ companyId, status: 'converted' }),
    countEnquiries({ companyId }),
    countUsers({ companyId, role: 'client' }),
    listUsers({ companyId, role: 'dietitian' }),
    countEnquiriesByStatus(companyId),
  ]);

  const followUpsToday = await countCalls({
    companyId,
    status: 'scheduled',
    from: startOfDay(),
    to: endOfDay(),
  });

  const clientsByDietitian = new Map(
    (await countUsersGroupedByDietitian(companyId)).map((row) => [row.dietitianId, row.clients])
  );
  const dietitianWorkload = dietitians.map((d) => ({
    dietitian: d.name,
    clients: clientsByDietitian.get(d.id) ?? 0,
  }));

  // Real weekly enquiry volume for the last GROWTH_WEEKS weeks (including weeks with zero
  // enquiries, so the chart's x-axis is a continuous timeline, not just weeks that had activity).
  const earliestWeek = startOfWeek(new Date(Date.now() - (GROWTH_WEEKS - 1) * 7 * 24 * 60 * 60 * 1000));
  const createdAtRows = await listEnquiryCreatedAtSince(companyId, earliestWeek);
  const countByWeek = new Map();
  for (const createdAt of createdAtRows) {
    const key = startOfWeek(createdAt).toISOString().slice(0, 10);
    countByWeek.set(key, (countByWeek.get(key) ?? 0) + 1);
  }
  const growthSeries = Array.from({ length: GROWTH_WEEKS }, (_, i) => {
    const week = new Date(earliestWeek.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const key = week.toISOString().slice(0, 10);
    return { week: key, enquiries: countByWeek.get(key) ?? 0 };
  });

  const countByStatus = new Map(statusCounts.map((s) => [s.status, s.count]));
  const statusBreakdown = ENQUIRY_STATUSES.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));

  res.json({
    newEnquiries,
    followUpsToday,
    conversionRate: totalEnquiries ? Math.round((converted / totalEnquiries) * 1000) / 10 : 0,
    activeClients,
    growthSeries,
    dietitianWorkload,
    statusBreakdown,
  });
});

// Percentage change from `previous` to `current`, or null when there is no baseline to compare
// against. Null (rather than 0, or 100 for "0 → n") matters: the overview renders a real figure or
// nothing at all, so an empty account never shows an invented trend.
function changePct(current, previous) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

const PROGRESS_SERIES_DAYS = 7;
const STAT_WINDOW_DAYS = 30;

export const dietitianOverview = asyncHandler(async (req, res) => {
  const dietitianId = req.user.id;
  const companyId = req.user.companyId;
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const day = 24 * 60 * 60 * 1000;

  // Two equal, adjacent windows ending now — [prevWindowStart, windowStart) and [windowStart, now)
  // — so each stat card's change figure compares like with like.
  const windowStart = new Date(Date.now() - STAT_WINDOW_DAYS * day);
  const prevWindowStart = new Date(Date.now() - 2 * STAT_WINDOW_DAYS * day);

  const clientIds = await listClientIdsByDietitian(dietitianId);

  const [
    todaysAppointments,
    clientMomentum,
    totalClients,
    clientsThisWindow,
    clientsPrevWindow,
    planStates,
    plansThisWindow,
    plansPrevWindow,
    callsToday,
    callsSameDayLastWeek,
  ] = await Promise.all([
    listCallsForDietitianInRange(dietitianId, dayStart, dayEnd),
    latestProgressByClientIds(clientIds),
    countUsers({ companyId, role: 'client', assignedDietitian: dietitianId }),
    countClientsCreatedBetween(dietitianId, windowStart, new Date()),
    countClientsCreatedBetween(dietitianId, prevWindowStart, windowStart),
    countPlanStatesForDietitian(dietitianId, dayStart),
    countPublishedPlansCreatedBetween(dietitianId, windowStart, new Date()),
    countPublishedPlansCreatedBetween(dietitianId, prevWindowStart, windowStart),
    countCalls({ companyId, dietitian: dietitianId, from: dayStart, to: dayEnd }),
    countCalls({
      companyId,
      dietitian: dietitianId,
      from: new Date(dayStart.getTime() - 7 * day),
      to: new Date(dayEnd.getTime() - 7 * day),
    }),
  ]);

  // Progress logs per day across the last PROGRESS_SERIES_DAYS days, gaps filled with zero so the
  // chart's x-axis is a continuous week rather than only the days that happened to have activity.
  const seriesStart = new Date(dayStart.getTime() - (PROGRESS_SERIES_DAYS - 1) * day);
  const loggedByDay = new Map(
    (await countProgressByDayForClients(clientIds, seriesStart, dayEnd)).map((r) => [r.date, r.logs])
  );
  const progressSeries = Array.from({ length: PROGRESS_SERIES_DAYS }, (_, i) => {
    const date = new Date(seriesStart.getTime() + i * day);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { date: key, logs: loggedByDay.get(key) ?? 0 };
  });

  res.json({
    todaysAppointments: todaysAppointments.map((c) => toClientShape(c)),
    attentionItems: [],
    clientMomentum: clientMomentum.length,
    // Each stat pairs its own value with the change figure the UI labels it by — the client never
    // has to guess which window a percentage came from.
    stats: {
      clients: {
        total: totalClients,
        // Growth of the total itself, not just the count of new arrivals: n new over a base of
        // (total - n) is what "the roster grew x%" actually means.
        changePct: changePct(totalClients, totalClients - clientsThisWindow),
        addedThisWindow: clientsThisWindow,
        addedPrevWindow: clientsPrevWindow,
        windowDays: STAT_WINDOW_DAYS,
      },
      appointmentsToday: {
        total: callsToday,
        changePct: changePct(callsToday, callsSameDayLastWeek),
        sameDayLastWeek: callsSameDayLastWeek,
      },
      activePlans: {
        total: planStates.active,
        // Publishing volume this window vs the one before — the active set is a point-in-time
        // number with no stored history, so there is nothing honest to compare it against.
        changePct: changePct(plansThisWindow, plansPrevWindow),
        publishedThisWindow: plansThisWindow,
        publishedPrevWindow: plansPrevWindow,
        windowDays: STAT_WINDOW_DAYS,
      },
    },
    progressSeries,
    planBreakdown: planStates,
  });
});
