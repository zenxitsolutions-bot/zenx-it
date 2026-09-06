import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

export async function createEnquiry(input) {
  const id = newId();
  await pool.query(
    `INSERT INTO enquiries
      (id, company_name, contact_name, phone, email, website, service, source, status, priority,
       address_line1, address_line2, city, state, zip, country, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.companyName,
      input.contactName,
      input.phone,
      input.email,
      input.website ?? null,
      input.service,
      input.source,
      // The public contact form can only ever create a NEW lead — status is never accepted from
      // the caller for this insert (mirrors the RLS policy this replaces: "anon insert allowed
      // only with status='NEW'").
      'NEW',
      input.priority ?? 'MEDIUM',
      input.addressLine1 ?? null,
      input.addressLine2 ?? null,
      input.city ?? null,
      input.state ?? null,
      input.zip ?? null,
      input.country ?? null,
      input.notes ?? null,
    ]
  );
  return findEnquiryById(id);
}

export async function listEnquiries() {
  const [rows] = await pool.query('SELECT * FROM enquiries ORDER BY created_at DESC');
  return rows;
}

export async function findEnquiryById(id, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM enquiries WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

// priority / assigned_to / estimated_value patch — mirrors services/enquiries.ts#updatePatch.
export async function updateEnquiryPatch(id, patch) {
  const { sets, params } = buildSetClause(
    { priority: 'priority', assignedTo: 'assigned_to', estimatedValue: 'estimated_value' },
    patch
  );
  if (sets.length) {
    await pool.query(`UPDATE enquiries SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  }
  return findEnquiryById(id);
}

export async function updateEnquiryStatus(id, status, conn = pool) {
  const extra =
    status === 'CONVERTED' ? ', converted_at = CURRENT_TIMESTAMP(3)' : status === 'LOST' ? ', lost_at = CURRENT_TIMESTAMP(3)' : '';
  await conn.query(`UPDATE enquiries SET status = ?${extra} WHERE id = ?`, [status, id]);
  return findEnquiryById(id, conn);
}
