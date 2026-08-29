import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';

// input.id lets a caller pin a specific id instead of a fresh random one — only used by
// seed.js#seedLegacyCompany, so the grandfathered company's id matches the value already
// backfilled onto wellness-app's pre-existing data (LEGACY_COMPANY_ID) exactly, rather than the
// two sides disagreeing on which id "the legacy company" actually is.
export async function createCompany(input, conn = pool) {
  const id = input.id ?? newId();
  await conn.query(
    `INSERT INTO companies
      (id, enquiry_id, company_name, company_slug, company_email, company_phone, website,
       address_line1, address_line2, city, state, zip, country)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.enquiryId ?? null,
      input.companyName,
      input.companySlug,
      input.companyEmail ?? null,
      input.companyPhone ?? null,
      input.website ?? null,
      input.addressLine1 ?? null,
      input.addressLine2 ?? null,
      input.city ?? null,
      input.state ?? null,
      input.zip ?? null,
      input.country ?? null,
    ]
  );
  return findCompanyById(id, conn);
}

export async function findCompanyById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM companies WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function findCompanyBySlug(slug, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM companies WHERE company_slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

export async function listCompanies() {
  const [rows] = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
  return rows;
}

export async function updateCompanyStatus(id, status) {
  await pool.query('UPDATE companies SET status = ? WHERE id = ?', [status, id]);
  return findCompanyById(id);
}

export async function updateCompanyLogo(id, logoUrl) {
  await pool.query('UPDATE companies SET logo_url = ? WHERE id = ?', [logoUrl, id]);
  return findCompanyById(id);
}
