import { pool } from '../db/pool.js';

// ZenX admin-server is the source of truth for company identity (see auth.controller.js#handoff's
// claim-shape comment) — wellness-app just mirrors the fields it needs locally so users.company_id
// has something to point its FK at. Upserted on every handoff, not just first-time, so a rename in
// ZenX (company_name/slug/website/logo_url) propagates here instead of freezing at first SSO.
//
// `website` is COALESCE'd rather than overwritten: a token minted by an admin-server that predates
// the website claim carries `undefined` there, and blindly writing that would wipe a value a newer
// token had already mirrored. A real clearing on the ZenX side sends an explicit null, which is
// indistinguishable from "absent" in JSON — accepted, since a stale-but-correct link is a better
// failure than one that disappears every other login during a rolling deploy.
// Returns the id this company actually has here, which is NOT always the ZenX id in the token.
// This table has two unique keys (PRIMARY KEY(id) and uq_companies_slug), so a plain
// ON DUPLICATE KEY UPDATE can collide on the *slug* and update a pre-existing row instead of
// inserting, leaving the token's company_id absent — and the caller then inserts a user pointing
// at an id that isn't there, failing fk_users_company. That happens whenever a company is deleted
// and recreated in ZenX under the same slug: ZenX mints a new id, this mirror still holds the old
// one. Resolving id-then-slug and returning the effective id keeps the FK satisfiable.
//
// A slug already held under a different id keeps that id rather than being retargeted, so rows
// already pointing at it are never orphaned. Mirrors admin-server's WellnessDb.js#upsertCompany.
export async function upsertCompanyFromHandoff({ id, name, slug, website, logoUrl }) {
  const [byId] = await pool.query('SELECT id FROM companies WHERE id = ? LIMIT 1', [id]);
  if (byId[0]) {
    // `website` is COALESCE'd rather than overwritten: a token minted by an admin-server that
    // predates the website claim carries `undefined` there, and blindly writing that would wipe a
    // value a newer token had already mirrored.
    await pool.query(
      'UPDATE companies SET name = ?, slug = ?, website = COALESCE(?, website), logo_url = ? WHERE id = ?',
      [name, slug, website ?? null, logoUrl, id]
    );
    return id;
  }

  const [bySlug] = await pool.query('SELECT id FROM companies WHERE slug = ? LIMIT 1', [slug]);
  if (bySlug[0]) {
    await pool.query('UPDATE companies SET name = ?, website = COALESCE(?, website), logo_url = ? WHERE id = ?', [
      name,
      website ?? null,
      logoUrl,
      bySlug[0].id,
    ]);
    return bySlug[0].id;
  }

  await pool.query('INSERT INTO companies (id, name, slug, website, logo_url) VALUES (?, ?, ?, ?, ?)', [
    id,
    name,
    slug,
    website ?? null,
    logoUrl,
  ]);
  return id;
}

export async function findCompanyById(id) {
  const [rows] = await pool.query('SELECT id, name, slug, website, logo_url FROM companies WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

// Two callers, both needing the slug -> company resolution: the unauthenticated branding lookup on
// a slug-scoped login page (company.controller.js#getPublicCompany) and the tenant check on login
// (auth.controller.js#login). `status` is here for the latter — getPublicCompany whitelists the
// fields it echoes back (name, slug, logo) rather than spreading this row, so a logged-out visitor
// still learns nothing beyond the branding they already have the URL for.
//
// Slug comparison is case-insensitive: `companies.slug` is UNIQUE under utf8mb4's default
// case-insensitive collation, so `/ABC-Nutrition` and `/abc-nutrition` resolve to the same tenant
// rather than one of them silently failing to resolve at all.
export async function findCompanyBySlug(slug) {
  const [rows] = await pool.query('SELECT id, name, slug, logo_url, status FROM companies WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] ?? null;
}
