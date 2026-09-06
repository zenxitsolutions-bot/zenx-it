// One-off report (docs/specs/2026-round2-fixes.md item 1): the old Follow-up flow force-created a
// client account before a lead was ever explicitly marked Converted/Won. Finds every account that
// was created that way — every converted enquiry whose *first* history transition to reach
// 'follow-up' or 'converted' was 'follow-up' — and prints a report.
//
// Read-only. Never deletes anything itself — report what's found first, decide what to do with
// each one after (an account may have real client data on it by now: progress entries, reports,
// completed calls — not necessarily safe to blanket-delete just because of how it was created).
//
// Usage: node src/db/auditConvertedAccounts.js
import { pool } from './pool.js';

async function main() {
  const [rows] = await pool.query(`
    SELECT
      e.id AS enquiry_id, e.name AS enquiry_name, e.email, e.status AS enquiry_status,
      u.id AS user_id, u.created_at AS user_created_at,
      (SELECT h.status FROM enquiry_history h
         WHERE h.enquiry_id = e.id AND h.status IN ('follow-up', 'converted')
         ORDER BY h.created_at ASC LIMIT 1) AS first_conversion_status,
      (SELECT COUNT(*) FROM progress p WHERE p.client_id = u.id) AS progress_count,
      (SELECT COUNT(*) FROM reports r WHERE r.client_id = u.id) AS report_count,
      (SELECT COUNT(*) FROM calls c WHERE c.client_id = u.id AND c.status = 'completed') AS completed_call_count
    FROM enquiries e
    JOIN users u ON u.id = e.converted_user_id
    WHERE e.converted_user_id IS NOT NULL
    ORDER BY u.created_at ASC
  `);

  const tooEarly = rows.filter((r) => r.first_conversion_status === 'follow-up');

  console.log(
    `[audit] ${rows.length} enquiry-converted account(s) total; ${tooEarly.length} were created by ` +
      `the old Follow-up auto-create (before the lead was ever marked Converted):\n`
  );

  if (tooEarly.length === 0) {
    console.log('  (none found)');
  } else {
    for (const r of tooEarly) {
      const hasRealActivity = r.progress_count > 0 || r.report_count > 0 || r.completed_call_count > 0;
      console.log(
        `  - user ${r.user_id} — ${r.enquiry_name} <${r.email}>\n` +
          `    enquiry ${r.enquiry_id}, now status "${r.enquiry_status}", account created ${r.user_created_at.toISOString()}\n` +
          `    activity since: ${r.progress_count} progress entr${r.progress_count === 1 ? 'y' : 'ies'}, ` +
          `${r.report_count} report(s), ${r.completed_call_count} completed call(s)` +
          (hasRealActivity ? '  ⚠ has real activity — review before deleting' : '  (no activity recorded)') +
          '\n'
      );
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error('[audit] failed', err);
  process.exit(1);
});
