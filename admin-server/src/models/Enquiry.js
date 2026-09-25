import { pool } from '../db/pool.js';
import { newId } from '../db/id.js';
import { buildSetClause } from '../db/helpers.js';

const optionalValue = (value) => value?.trim() || null;

export async function createEnquiry(input) {
  const id = newId();
  await pool.query(
    `INSERT INTO enquiries
      (id, company_name, contact_name, phone, email, website, service, source, status, priority,
       address_line1, address_line2, city, state, zip, country, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      optionalValue(input.companyName),
      input.contactName,
      input.phone,
      input.email,
      optionalValue(input.website),
      optionalValue(input.service),
      optionalValue(input.source),
      // The public contact form can only ever create a NEW lead — status is never accepted from
      // the caller for this insert (mirrors the RLS policy this replaces: "anon insert allowed
      // only with status='NEW'").
      'NEW',
      input.priority ?? 'MEDIUM',
      optionalValue(input.addressLine1),
      optionalValue(input.addressLine2),
      optionalValue(input.city),
      optionalValue(input.state),
      optionalValue(input.zip),
      optionalValue(input.country),
      optionalValue(input.notes),
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
