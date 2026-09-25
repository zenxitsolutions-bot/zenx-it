import { pool } from '../db/pool.js';

export async function connectDb() {
  await pool.query('SELECT 1');
  console.log('[db] connected');
}
