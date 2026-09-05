import { findUserById } from '../models/User.js';
import { ApiError } from './ApiError.js';

// A dietitian querying `?client=<id>` may only ever see clients assigned to them; every other
// role reaching this (in practice just 'admin' — route-level `authorize()` already keeps plain
// clients out of this path entirely) still must have the client in their own org — admin is
// org-scoped, not platform-scoped, same as everywhere else in this app. One 404 (not 403) either
// way, so a wrong-org id can't be distinguished from an id that doesn't exist at all.
export async function assertDietitianOwnsClient(req, clientId) {
  const client = await findUserById(clientId);
  if (!client || client.companyId !== req.user.companyId) throw ApiError.notFound();
  if (req.user.role !== 'dietitian') return;

  if (String(client.assignedDietitian) !== req.user.id) throw ApiError.forbidden();
}

// Multi-tenancy guard for any row reached via a bare by-id lookup on a table with no company_id
// of its own (reports, recipes, plans, calls, ...) — the row's owning user (client, dietitian, or
// whoever created it) is looked up and its company compared against the caller's. 404, not 403: a
// wrong-company id shouldn't reveal that the row exists at all, same reasoning as
// enquiry.controller.js#assertOwnEnquiry.
export async function assertUserInCompany(req, userId) {
  const user = await findUserById(userId);
  if (!user || user.companyId !== req.user.companyId) throw ApiError.notFound();
}

// Company-scoping equivalent of the id-equality checks already sprinkled through the controllers
// (e.g. `target.companyId !== req.user.companyId`) — kept here so the "why" (never trust a
// cross-service/cross-tenant id without re-checking company) has one place to read.
export function assertSameCompany(req, otherCompanyId) {
  if (otherCompanyId !== req.user.companyId) throw ApiError.notFound();
}
