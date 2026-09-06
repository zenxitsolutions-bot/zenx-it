import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

// timezone: 'Z' makes mysql2 treat every DATE/DATETIME value as UTC in both directions — the app
// (and its data, e.g. week-start dates) is UTC-everywhere by convention already (see the UTC
// comments in insights.controller.js and seed.js, added after a real local-timezone bug there).
// Without this, the driver would serialize JS Date values using the server host's local offset,
// silently shifting calendar days for anyone not already running in UTC.
export const pool = mysql.createPool({ uri: env.mysqlUrl, timezone: 'Z' });

// Wraps a set of writes that touch more than one table (e.g. a plan and its meals) in a single
// transaction — mysql2 has no ORM-level unit-of-work, so callers get a connection explicitly.
//
// Retries on a genuine InnoDB deadlock/lock-wait-timeout: the availability guard's row-locking
// (server/src/models/Call.js#lockOverlappingCalls, used from a transaction here) makes two
// concurrent bookings for the same dietitian each take a gap lock and then insert — under load
// this can form a real lock cycle that InnoDB detects and kills one side of (ER_LOCK_DEADLOCK),
// reproduced empirically while testing the concurrent-booking race. Retrying the whole `fn` is the
// standard mitigation; it's a transient condition, not a real conflict (unlike ApiError.conflict,
// which is a deliberate rejection and is never retried).
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
