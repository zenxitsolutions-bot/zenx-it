import crypto from 'node:crypto';
import { findUserById } from '../models/User.js';
import { findCompanyById } from '../models/Company.js';
import { createPasswordResetToken, hashResetToken } from '../models/PasswordResetToken.js';
import { env } from '../config/env.js';
import { welcomeQueueParams } from './security.js';

export function welcomeExpiryLabel(minutes) {
  return minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} minutes`;
}

// Dependency injection permits delivery/retry checks without any database writes
// or real email. Persist ONLY the token hash; never put the URL back into the row.
export async function prepareWelcomeDelivery(row, dependencies = {}) {
  const lookupUser = dependencies.findUserById ?? findUserById;
  const lookupCompany = dependencies.findCompanyById ?? findCompanyById;
  const createToken = dependencies.createPasswordResetToken ?? createPasswordResetToken;
  const randomToken = dependencies.randomToken ?? (() => crypto.randomBytes(32).toString('hex'));
  const settings = dependencies.env ?? env;
  const now = dependencies.now ?? Date.now;
  if (row.relatedEntity?.type !== 'client' || !row.relatedEntity.id) throw new Error('Welcome email requires a client reference');
  const user = await lookupUser(row.relatedEntity.id);
  if (!user || user.role !== 'client' || user.accountStatus !== 'active' ||
      user.email?.trim().toLowerCase() !== row.to?.trim().toLowerCase() || !user.companyId) {
    throw new Error('Welcome email recipient is no longer eligible');
  }
  const company = await lookupCompany(user.companyId);
  if (!company || company.status !== 'ACTIVE' || !company.slug) throw new Error('Welcome email company is not active');
  const rawToken = randomToken();
  const expiresAt = new Date(now() + settings.passwordResetTokenTtlMinutes * 60 * 1000);
  await createToken({ userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt });
  const origin = settings.clientOrigin.replace(/\/+$/, '');
  const prefix = `${origin}/${encodeURIComponent(company.slug)}`;
  return {
    ...welcomeQueueParams(row.params),
    client_name: user.name,
    company_name: company.name,
    login_url: `${prefix}/login`,
    set_password_url: `${prefix}/reset-password?token=${encodeURIComponent(rawToken)}`,
    expiry_label: welcomeExpiryLabel(settings.passwordResetTokenTtlMinutes),
  };
}
