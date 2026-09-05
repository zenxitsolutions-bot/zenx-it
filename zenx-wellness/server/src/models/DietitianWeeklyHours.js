import { pool, withTransaction } from '../db/pool.js';
import { newId } from '../db/id.js';

function mapWeeklyHours(row) {
  return {
    id: row.id,
    dietitian: row.dietitian_id,
    weekday: row.weekday,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

export async function listWeeklyHours(dietitianId, conn = pool) {
  const [rows] = await conn.query(
    'SELECT * FROM dietitian_weekly_hours WHERE dietitian_id = ? ORDER BY weekday ASC',
    [dietitianId]
  );
  return rows.map(mapWeeklyHours);
}

// Whole-template replace: delete every existing row for this dietitian and insert the given set —
// the simplest correct contract for a 7-row weekly grid submitted as one form (mirrors
// Plan.js#updatePlanById's delete-all-then-reinsert handling of plan_meals).
export async function replaceWeeklyHours(dietitianId, days) {
  await withTransaction(async (conn) => {
    await conn.query('DELETE FROM dietitian_weekly_hours WHERE dietitian_id = ?', [dietitianId]);
    if (!days.length) return;
    const values = [];
    const placeholders = days
      .map((day) => {
        values.push(newId(), dietitianId, day.weekday, day.startTime, day.endTime);
        return '(?, ?, ?, ?, ?)';
      })
      .join(', ');
    await conn.query(
      `INSERT INTO dietitian_weekly_hours (id, dietitian_id, weekday, start_time, end_time) VALUES ${placeholders}`,
      values
    );
  });
  return listWeeklyHours(dietitianId);
}
