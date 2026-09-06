import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { withTransaction } from '../db/pool.js';
import { createCompany, findCompanyBySlug } from '../models/Company.js';
import { createUser, findUserByEmail } from '../models/ZenxUser.js';
import { createApplicationAccess } from '../models/ApplicationAccess.js';
import { createAuditLog } from '../models/AuditLog.js';
import { updateEnquiryStatus } from '../models/Enquiry.js';
import { hashPassword } from '../utils/password.js';
import { sendCustomerWelcomeEmail } from '../emails/sendCustomerWelcomeEmail.js';
import { provisionWellnessUser } from '../models/WellnessDb.js';

// role defaulting — copied verbatim from the Deno edge function this replaces
// (create-customer-account/index.ts#defaultRoleFor).
function defaultRoleFor(applicationSlug) {
  return applicationSlug === 'zenx-pos' ? 'pos_admin' : 'wellness_admin';
}

// Admins (and the public contact form this often comes from) type 'acme.com' far more often than
// 'https://acme.com'. Stored with a scheme so every consumer — wellness-app's sidebar link
// included — can put it straight into an href without each one re-deriving this. Anything already
// carrying a scheme is left exactly as typed; blank stays NULL rather than becoming 'https://'.
function normalizeWebsite(website) {
  const trimmed = website?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const checkCompanySlugAvailable = asyncHandler(async (req, res) => {
  const existing = await findCompanyBySlug(req.params.slug);
  res.json({ available: !existing });
});

// Replaces create-customer-account. Unlike the Deno version (a sequence of individual Postgres
// statements, not atomic), this runs inside one transaction — a failure partway through (e.g. the
// second application_access insert) rolls back the company and user too, instead of leaving an
// orphaned company with no usable account.
export const provisionCustomerAccount = asyncHandler(async (req, res) => {
  const {
    enquiryId,
    companyName,
    companySlug,
    website,
    firstName,
    lastName,
    phone,
    email,
    jobTitle,
    applicationSlugs,
    password,
    addressLine1,
    addressLine2,
    city,
    state,
    zip,
    country,
    status,
    subscriptionPlan,
  } = req.body;
  const normalizedWebsite = normalizeWebsite(website);

  if (await findCompanyBySlug(companySlug)) throw ApiError.conflict('That company URL is already taken');
  if (await findUserByEmail(email)) throw ApiError.conflict('A customer account with this email already exists');

  const { company, user, grants } = await withTransaction(async (conn) => {
    const company = await createCompany({
      enquiryId,
      companyName,
      companySlug,
      website: normalizedWebsite,
      companyEmail: email,
      companyPhone: phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country,
      status: status ?? 'ACTIVE',
      subscriptionPlan: subscriptionPlan ?? null,
    }, conn);
    const user = await createUser(
      { email, passwordHash: await hashPassword(password), firstName, lastName, phone, jobTitle, mustChangePassword: true },
      conn
    );
    const grants = [];
    for (const slug of applicationSlugs) {
      grants.push(await createApplicationAccess({ userId: user.id, companyId: company.id, application: slug, role: defaultRoleFor(slug) }, conn));
    }
    await createAuditLog(
      { adminId: req.staff.id, action: 'CREATE_COMPANY', entityType: 'company', entityId: company.id, description: `Provisioned ${companyName} for ${email}` },
      conn
    );
    if (enquiryId) await updateEnquiryStatus(enquiryId, 'CONVERTED', conn);
    return { company, user, grants };
  });

  // Account is already committed at this point — neither of these is allowed to turn an otherwise-
  // successful provisioning call into a 500. Welcome-email failure (e.g. Resend sandbox
  // restrictions in dev) and the wellness-app eager-create (a best-effort mirror — the SSO handoff
  // still creates it lazily on first login if this is skipped or fails) are both non-fatal.
  try {
    await sendCustomerWelcomeEmail({ to: email, name: firstName, companyName });
  } catch (err) {
    console.error('[provisionCustomerAccount] welcome email failed', err);
  }

  if (applicationSlugs.includes('zenx-dietitian')) {
    try {
      await provisionWellnessUser({
        zenxUserId: user.id,
        name: `${firstName} ${lastName}`.trim(),
        email,
        zenxRole: defaultRoleFor('zenx-dietitian'),
        companyId: company.id,
        companyName,
        companySlug,
        website: company.website,
        logoUrl: company.logo_url,
        temporaryPassword: password,
      });
    } catch (err) {
      console.error('[provisionCustomerAccount] wellness-app eager create failed', err);
    }
  }

  res.status(201).json({ company, user, grants });
});
