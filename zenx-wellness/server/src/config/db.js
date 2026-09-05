import { pool } from '../db/pool.js';
import { env } from './env.js';

export async function connectDb() {
  await pool.query('SELECT 1');
  console.log(`[db] connected → ${env.mysqlUrl}`);
}
