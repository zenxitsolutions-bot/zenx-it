import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

// timezone: 'Z' — same reasoning as wellness-app/server/src/db/pool.js: treat every DATE/DATETIME
// value as UTC in both directions so calendar days never silently shift with the server's local
// offset.
//
// dateStrings: ['DATE'] — without it, mysql2 hands back followups.scheduled_date (the only DATE
// column in this schema) as a JS Date, which res.json() then serializes to a full
// "2026-08-28T00:00:00.000Z" datetime. The frontend builds `${scheduled_date}T${scheduled_time}`
// (FollowupsPage.tsx, utils/date.ts#combineDateTime) expecting a plain "2026-08-28" — concatenating
// the full datetime instead produces a garbled, unparseable string and every follow-up's date shows
// as "Invalid Date". Scoped to just DATE so DATETIME/TIMESTAMP columns elsewhere keep coming back as
// JS Dates (their current ISO-string wire format via JSON.stringify is unaffected).
export const pool = mysql.createPool({ uri: env.mysqlUrl, timezone: 'Z', dateStrings: ['DATE'] });

const RETRYABLE_ERROR_CODES = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT']);

export async function withTransaction(fn, { retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const result = await fn(conn);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      if (!RETRYABLE_ERROR_CODES.has(err.code) || attempt === retries) throw err;
    } finally {
      conn.release();
    }
  }
}
