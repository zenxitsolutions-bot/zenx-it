import { pool } from '../db/pool.js';

// Read-mostly: applications are seeded (see src/seed.js), only `url` is ever edited from the UI
// (ApplicationsPage.tsx) — handoff_secret is deliberately not exposed to any client-facing route.

export async function listApplications() {
  const [rows] = await pool.query('SELECT id, name, slug, description, url, created_at FROM applications ORDER BY name');
  return rows;
}

export async function findApplicationBySlug(slug, conn = pool) {
  const [rows] = await conn.query('SELECT * FROM applications WHERE slug = ? LIMIT 1', [slug]);
  return rows[0] || null;
}

export async function updateApplicationUrl(id, url) {
  await pool.query('UPDATE applications SET url = ? WHERE id = ?', [url, id]);
  const [rows] = await pool.query('SELECT id, name, slug, description, url, created_at FROM applications WHERE id = ?', [id]);
  return rows[0] || null;
}
