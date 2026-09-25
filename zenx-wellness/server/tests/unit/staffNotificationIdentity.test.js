import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../src/db/pool.js';
import { notifyCallEvent } from '../../src/services/callNotifications.js';
import { notifyScheduleGenerated } from '../../src/services/consultationScheduleNotifications.js';
import { notifyMealSwapRequested } from '../../src/services/planNotifications.js';

test('call, schedule and meal-swap producers bind all six staff templates to server-resolved recipient identity', async (t) => {
  const companyId = 'company-1';
  const staffRow = { id: 'staff-1', company_id: companyId, company_slug: 'company', name: 'Dietitian', email: 'staff@example.test', role: 'dietitian', account_status: 'active', timezone: 'Asia/Kolkata' };
  const clientRow = { id: 'client-1', company_id: companyId, company_slug: 'company', name: 'Client', email: 'client@example.test', role: 'client', account_status: 'active', timezone: 'America/Chicago' };
  const queued = [];
  const errors = [];
  t.mock.method(console, 'error', (...args) => errors.push(args));
  t.mock.method(pool, 'query', async (sql, values = []) => {
    if (sql.includes('SELECT u.*')) return [[values[0] === staffRow.id ? staffRow : clientRow]];
    if (sql.includes('SELECT ac.main_admin_user_id')) return [[{ main_admin_user_id: 'owner', permissions_json: null }]];
    if (sql.includes('FROM companies')) return [[{ id: companyId, name: 'Company', status: 'ACTIVE' }]];
    if (sql.includes('INSERT INTO email_log')) {
      queued.push({ to: values[2], templateKey: values[3], params: JSON.parse(values[5]) });
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT * FROM email_log')) return [[{ id: values[0], params: {} }]];
    if (sql.includes('FROM device_tokens')) return [[]];
    if (sql.includes('INSERT INTO notifications')) return [{ affectedRows: 1 }];
    if (sql.includes('FROM notifications')) return [[{ id: values[0], user_id: staffRow.id }]];
    assert.fail(`Unexpected query: ${sql}`);
  });
  const call = { id: 'call-1', client: clientRow.id, dietitian: staffRow.id, scheduledAt: new Date('2026-10-01T12:00:00Z'), icsSequence: 0 };
  for (const event of ['booked', 'rescheduled', 'cancelled', 'reminder']) {
    await notifyCallEvent(event, call, { previousScheduledAt: new Date('2026-09-30T12:00:00Z') });
  }
  const mapped = (row) => ({ id: row.id, companyId: row.company_id, companySlug: row.company_slug,
    name: row.name, role: row.role, email: row.email, accountStatus: row.account_status, timezone: row.timezone });
  await notifyScheduleGenerated({ schedule: { id: 'schedule-1' }, client: mapped(clientRow), dietitian: mapped(staffRow), createdCalls: [call], newGaps: [] });
  await notifyMealSwapRequested({ id: 'plan-1', client: clientRow.id, dietitian: staffRow.id,
    meals: [{ day: 'Monday', time: '8:00 AM', mealType: 'Breakfast', customTitle: 'Oats', swapRequested: true }] }, 0);

  assert.deepEqual(errors, []);
  const staffJobs = queued.filter((job) => job.to === staffRow.email);
  assert.deepEqual(staffJobs.map((job) => job.templateKey).sort(), [
    'call-scheduled-dietitian', 'call-rescheduled-dietitian', 'call-cancelled-dietitian',
    'call-reminder-dietitian', 'consultation-schedule-generated-dietitian', 'meal-swap-requested',
  ].sort());
  for (const job of staffJobs) {
    assert.equal(job.params.recipientUserId, staffRow.id, job.templateKey);
    assert.equal(job.params.recipientCompanyId, companyId, job.templateKey);
  }
  for (const job of queued.filter((entry) => entry.to === clientRow.email)) {
    assert.equal(job.params.recipientUserId, undefined, 'staff binding must not change client notification behavior');
  }
});
