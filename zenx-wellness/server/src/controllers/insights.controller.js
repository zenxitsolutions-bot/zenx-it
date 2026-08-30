import { countEnquiries, countEnquiriesByStatus, listEnquiryCreatedAtSince } from '../models/Enquiry.js';
import { countUsers, listUsers, countUsersGroupedByDietitian, listClientIdsByDietitian } from '../models/User.js';
import { countCalls, listCallsForDietitianInRange } from '../models/Call.js';
import { latestProgressByClientIds } from '../models/Progress.js';
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

export const dietitianOverview = asyncHandler(async (req, res) => {
  const todaysAppointments = await listCallsForDietitianInRange(req.user.id, startOfDay(), endOfDay());

  const clientIds = await listClientIdsByDietitian(req.user.id);
  const clientMomentum = await latestProgressByClientIds(clientIds);

  res.json({
    todaysAppointments: todaysAppointments.map((c) => toClientShape(c)),
    attentionItems: [],
    clientMomentum: clientMomentum.length,
  });
});
