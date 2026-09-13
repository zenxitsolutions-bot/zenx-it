import { readFileSync } from 'node:fs';
import { pool } from './pool.js';

// Add only the profile-photo table; avoid running unrelated historical migrations.
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const statement = schema.match(/CREATE TABLE IF NOT EXISTS user_photos \([\s\S]*?;/)?.[0];
try {
  if (!statement) throw new Error('Profile photo schema not found');
  await pool.query(statement);
  console.log('[db] profile-photo table ready');
} finally {
  await pool.end();
}
