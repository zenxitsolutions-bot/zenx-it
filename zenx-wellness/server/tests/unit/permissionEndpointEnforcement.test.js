import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { pool } from '../../src/db/pool.js';
import { signAccessToken } from '../../src/utils/jwt.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { requirePermission } from '../../src/middleware/permissions.js';
import { planRouter } from '../../src/routes/plan.routes.js';
import { recipeRouter } from '../../src/routes/recipe.routes.js';
import { reportRouter } from '../../src/routes/report.routes.js';
import { callRouter } from '../../src/routes/call.routes.js';
import { availabilityRouter } from '../../src/routes/availability.routes.js';
import { consultationScheduleRouter } from '../../src/routes/consultationSchedule.routes.js';
import { messageRouter } from '../../src/routes/message.routes.js';
import { supportMessageRouter } from '../../src/routes/supportMessage.routes.js';
import { enquiryRouter } from '../../src/routes/enquiry.routes.js';
import { clientNoteRouter } from '../../src/routes/clientNote.routes.js';
import { progressRouter } from '../../src/routes/progress.routes.js';
import { programPlanRouter } from '../../src/routes/programPlan.routes.js';
import { insightsRouter } from '../../src/routes/insights.routes.js';
import { emailLogRouter } from '../../src/routes/emailLog.routes.js';
import { integrationsRouter } from '../../src/routes/integrations.routes.js';

// Real middleware and routes, with every database call mocked. A denied capability must
// stop before entity data is read, before multipart buffers, and before any write or email.
test('staff permission denials cover module reads, downloads, streams, and writes', async (t) => {
  let role = 'admin';
  let disabled;
  const businessQueries = [];
  t.mock.method(pool, 'query', async (sql, params) => {
    if (sql.includes('LEFT JOIN company_access_control')) return [[{ main_admin_user_id: 'owner', permissions_json: JSON.stringify({ [disabled]: false }) }]];
    if (sql.includes('FROM users u')) return [[{ id: 'staff', role, company_id: 'company', account_status: 'active', password_hash: 'synthetic-only' }]];
    if (sql.includes('FROM auth_sessions')) return [[{ id: params[0] }]];
    if (sql.includes('FROM companies')) return [[{ id: 'company', status: 'ACTIVE' }]];
    businessQueries.push(sql);
    throw new Error('Business data must not be queried by a denied request');
  });
  t.mock.method(pool, 'getConnection', async () => { throw new Error('A denied request must not open a write transaction'); });
  const app = express();
  app.use(express.json());
  for (const [name, router] of Object.entries({ plans: planRouter, recipes: recipeRouter, reports: reportRouter,
    calls: callRouter, availability: availabilityRouter, schedules: consultationScheduleRouter,
    messages: messageRouter, support: supportMessageRouter, enquiries: enquiryRouter,
    notes: clientNoteRouter, progress: progressRouter, programs: programPlanRouter,
    insights: insightsRouter, emails: emailLogRouter, integrations: integrationsRouter })) app.use(`/${name}`, router);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const cases = [
    ['diet_plans.view', 'GET', '/plans'], ['diet_plans.view', 'GET', '/plans/id'], ['diet_plans.view', 'GET', '/plans/id/pdf'],
    ['diet_plans.edit', 'POST', '/plans'], ['diet_plans.edit', 'PATCH', '/plans/id'], ['diet_plans.delete', 'DELETE', '/plans/id'],
    ['recipes.view', 'GET', '/recipes'], ['recipes.view', 'GET', '/recipes/recommended'], ['recipes.view', 'GET', '/recipes/id'], ['recipes.view', 'GET', '/recipes/id/image'],
    ['recipes.manage', 'POST', '/recipes'], ['recipes.manage', 'PATCH', '/recipes/id'], ['recipes.manage', 'DELETE', '/recipes/id'],
    ['recipes.manage', 'POST', '/recipes/id/image'], ['recipes.manage', 'POST', '/recipes/id/duplicate'], ['recipes.view', 'POST', '/recipes/id/favorite'], ['recipes.view', 'DELETE', '/recipes/id/favorite'],
    ['reports.view', 'GET', '/reports'], ['reports.view', 'GET', '/reports/id/file'], ['reports.review', 'POST', '/reports/id/feedback'], ['reports.review', 'DELETE', '/reports/id'],
    ['calls.view', 'GET', '/calls'], ['calls.view', 'GET', '/calls/available-slots'], ['calls.manage', 'POST', '/calls'], ['calls.manage', 'PATCH', '/calls/id'], ['calls.manage', 'DELETE', '/calls/id'],
    ['calls.view', 'GET', '/availability/weekly-hours'], ['calls.manage', 'PUT', '/availability/weekly-hours'],
    ['calls.view', 'GET', '/availability/exceptions', 'dietitian'], ['calls.manage', 'POST', '/availability/exceptions', 'dietitian'], ['calls.manage', 'DELETE', '/availability/exceptions/id', 'dietitian'],
    ['calls.view', 'GET', '/schedules'], ['calls.manage', 'PUT', '/schedules'],
    ['calls.view', 'GET', '/integrations/google/status'], ['calls.manage', 'POST', '/integrations/google/connect'], ['calls.manage', 'DELETE', '/integrations/google'],
    ['messages.use', 'GET', '/messages/conversations', 'dietitian'], ['messages.use', 'GET', '/messages/unread-count', 'dietitian'],
    ['messages.use', 'GET', '/messages/presence'], ['messages.use', 'GET', '/messages/stream'],
    ['messages.use', 'GET', '/messages', 'dietitian'], ['messages.use', 'POST', '/messages', 'dietitian'], ['messages.use', 'POST', '/messages/read', 'dietitian'],
    ['messages.use', 'GET', '/support'], ['messages.use', 'GET', '/support/conversations'], ['messages.use', 'GET', '/support/unread-count'], ['messages.use', 'POST', '/support'], ['messages.use', 'POST', '/support/read'],
    ['enquiries.view', 'GET', '/enquiries'], ['enquiries.view', 'GET', '/enquiries/id'], ['enquiries.view', 'GET', '/enquiries/id/history'], ['enquiries.manage', 'PATCH', '/enquiries/id'], ['enquiries.manage', 'DELETE', '/enquiries/id'],
    ['clients.view', 'GET', '/notes'], ['clients.edit', 'POST', '/notes'], ['clients.edit', 'PATCH', '/notes/id'], ['clients.edit', 'DELETE', '/notes/id'],
    ['clients.view', 'GET', '/progress'], ['clients.edit', 'PATCH', '/progress/id'], ['clients.edit', 'DELETE', '/progress/id'],
    ['program_plans.view', 'GET', '/programs'], ['program_plans.manage', 'POST', '/programs'], ['program_plans.manage', 'PATCH', '/programs/id'],
    ['insights.view', 'GET', '/insights/admin-overview'], ['insights.view', 'GET', '/insights/dietitian-overview', 'dietitian'],
    ['email_logs.view', 'GET', '/emails'], ['email_logs.view', 'GET', '/emails/id'], ['email_logs.view', 'POST', '/emails/id/resend'],
    ['contact.view_email', 'GET', '/emails'], ['contact.view_email', 'GET', '/emails/id'], ['contact.view_email', 'POST', '/emails/id/resend'],
  ];
  try {
    for (const [key, method, path, viewerRole = 'admin'] of cases) {
      disabled = key;
      role = viewerRole;
      const response = await fetch(`${base}${path}`, { method,
        headers: { Authorization: `Bearer ${signAccessToken({ id: 'staff', role, companyId: 'company' }, 'session')}`, 'Content-Type': 'application/json' },
        ...(['POST', 'PATCH', 'PUT'].includes(method) ? { body: '{}' } : {}),
      });
      assert.equal(response.status, 403, `${role} ${method} ${path} must honor ${key}`);
      await response.arrayBuffer();
    }
    assert.deepEqual(businessQueries, []);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('staff capability middleware leaves client self-service ownership checks intact', () => {
  let error, continued = false;
  requirePermission('calls.view', 'calls.manage', 'diet_plans.view')(
    { user: { role: 'client', permissions: {} } }, {}, (value) => { error = value; continued = true; }
  );
  assert.equal(continued, true);
  assert.equal(error, undefined);
  requirePermission('calls.view')({}, {}, (value) => { error = value; });
  assert.equal(error.status, 401);
});
