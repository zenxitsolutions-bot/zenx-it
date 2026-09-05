import { findCompanyById, findCompanyBySlug } from '../models/Company.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

// The logged-in user's own company, as mirrored from ZenX. Scoped to req.user.companyId, never a
// client-supplied id — this app never lets one tenant read another's record, and there is no
// listing endpoint at all (ZenX's admin portal is where companies are browsed).
export const getMyCompany = asyncHandler(async (req, res) => {
  const company = await findCompanyById(req.user.companyId);
  // A user can legitimately predate its company ever being mirrored here (an account created
  // directly in this app before any SSO handoff). Null rather than 404 so the UI can fall back to
  // the default Nourishly branding instead of rendering an error for a normal state.
  res.json({
    company: company
      ? { id: company.id, name: company.name, slug: company.slug, website: company.website, logoUrl: company.logo_url }
      : null,
  });
});

// Unauthenticated, for the branding on a slug-scoped login page (/:companySlug/login). Returns
// only what's already public to anyone who has the URL — the company's display name and logo —
// and deliberately not `website`, contact details, or any count of who's inside. Responds with
// null (not 404) for an unknown slug so this can't be used to enumerate which slugs exist.
export const getPublicCompany = asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  if (!slug) throw ApiError.badRequest('A company slug is required');
  const company = await findCompanyBySlug(slug);
  res.json({ company: company ? { name: company.name, slug: company.slug, logoUrl: company.logo_url } : null });
});
