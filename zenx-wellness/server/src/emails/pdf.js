import { findPlanById } from '../models/Plan.js';
import { findUserById } from '../models/User.js';
import { findCompanyById } from '../models/Company.js';
import { planPdfFileName, renderPlanPdf } from '../services/planPdf.js';

// Built at send time (not enqueue time) so the worker can retry a failed PDF render the same way
// it retries ICS. params.planId is stored on the email_log row — the binary PDF is never persisted.
export async function buildPdfAttachment(templateKey, params) {
  if (templateKey !== 'plan-published' || !params?.planId) return null;

  const plan = await findPlanById(params.planId);
  if (!plan) throw new Error(`Cannot attach plan PDF: plan ${params.planId} was not found`);

  const [client, dietitian] = await Promise.all([findUserById(plan.client), findUserById(plan.dietitian)]);
  const company = dietitian?.companyId ? await findCompanyById(dietitian.companyId) : null;

  const content = await renderPlanPdf({ plan, client, dietitian, company });
  return {
    filename: planPdfFileName({ plan, client }),
    contentType: 'application/pdf',
    content,
  };
}
