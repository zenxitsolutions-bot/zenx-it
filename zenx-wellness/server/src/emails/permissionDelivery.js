import { findUserById } from '../models/User.js';
import { hydrateUserPermissions } from '../models/AccessControl.js';
import { hasPermission } from '../../../shared/permissions.js';
import { canNotifyUser } from '../services/notifyGuard.js';

const REQUIRED_PERMISSION = {
  'call-scheduled-dietitian': 'calls.view',
  'call-rescheduled-dietitian': 'calls.view',
  'call-cancelled-dietitian': 'calls.view',
  'call-reminder-dietitian': 'calls.view',
  'consultation-schedule-generated-dietitian': 'calls.view',
  'meal-swap-requested': 'diet_plans.view',
};

const sameEmail = (left, right) => typeof left === 'string' && typeof right === 'string'
  && left.trim().toLowerCase() === right.trim().toLowerCase();
const hasIdentity = (value) => typeof value === 'string' && value.length > 0;

// These reserved values come from the server-resolved staff account, never from
// caller-supplied template params. Email addresses are mutable, so a queue job
// must stay bound to its original account and company even after a rename.
export function bindStaffRecipientIdentity(to, templateKey, params, recipient) {
  if (!REQUIRED_PERMISSION[templateKey]) return params;
  if (!recipient || !['admin', 'dietitian'].includes(recipient.role)
    || !hasIdentity(recipient.id) || !hasIdentity(recipient.companyId)
    || !sameEmail(recipient.email, to)) {
    throw new Error('Staff notification requires a matching account and company reference');
  }
  return { ...params, recipientUserId: recipient.id, recipientCompanyId: recipient.companyId };
}

export function privateCalendarParams(params, recipient) {
  if (hasPermission(recipient, 'contact.view_email') || !params?.ics) return params;
  // Staff still receive their appointment, without an ATTENDEE field revealing
  // the client's hidden address. Names, times and the meeting link are unchanged.
  return { ...params, ics: { ...params.ics, attendee: undefined } };
}

// Permission checks at queue time alone are insufficient: a queued/retried email
// may be delivered after the owner has restricted this staff member's access.
export async function preparePermissionDelivery(row, dependencies = {}) {
  const required = REQUIRED_PERMISSION[row.templateKey];
  if (!required) return row.params;
  const { recipientUserId, recipientCompanyId } = row.params ?? {};
  // Legacy staff jobs cannot be safely attributed by email alone. Fail closed;
  // do not upgrade them by guessing whichever account now owns that address.
  if (!hasIdentity(recipientUserId) || !hasIdentity(recipientCompanyId)) {
    throw new Error('Staff notification is missing its account and company reference');
  }
  const findUser = dependencies.findUserById ?? findUserById;
  const hydrate = dependencies.hydrateUserPermissions ?? hydrateUserPermissions;
  const recipient = await hydrate(await findUser(recipientUserId));
  if (!recipient || !['admin', 'dietitian'].includes(recipient.role)
    || recipient.id !== recipientUserId || recipient.companyId !== recipientCompanyId
    || !sameEmail(recipient.email, row.to)
    || !canNotifyUser(recipient) || !hasPermission(recipient, required)) {
    throw new Error('Notification recipient is not permitted to receive this content');
  }
  return privateCalendarParams(row.params, recipient);
}
