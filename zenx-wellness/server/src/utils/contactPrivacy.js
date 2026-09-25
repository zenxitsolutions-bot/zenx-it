import { hasPermission } from '../../../shared/permissions.js';

// Structured contact fields only. Do not regex-rewrite user-authored notes, chat
// messages, recipe text, or arbitrary URLs: those are content, not a directory.
const EMAIL_KEYS = new Set([
  'email', 'emailaddress', 'clientemail', 'dietitianemail', 'enquiryemail',
  'useremail', 'contactemail', 'recipientemail', 'toemail', 'googleemail',
]);
const PHONE_KEYS = new Set([
  'phone', 'phonenumber', 'mobile', 'mobilenumber', 'telephone',
  'clientphone', 'dietitianphone', 'enquiryphone', 'userphone', 'contactphone',
]);
const EMAIL_ENVELOPES = new Set(['email', 'emails', 'emaillog', 'emaillogs', 'recipient', 'recipients', 'attendee', 'attendees', 'organizer']);
const ADDRESS_FIELDS = new Set(['to', 'from', 'cc', 'bcc', 'replyto']);
const normalizedKey = (key) => key.replace(/[_-]/g, '').toLowerCase();
const idOf = (user) => user?.id ?? user?._id;

export function redactContactDetails(payload, viewer) {
  if (!viewer || !['admin', 'dietitian'].includes(viewer.role)) return payload;
  const showEmail = hasPermission(viewer, 'contact.view_email');
  const showPhone = hasPermission(viewer, 'contact.view_phone');
  if (showEmail && showPhone) return payload;

  function visit(value, context = '') {
    if (Array.isArray(value)) return value.map((item) => visit(item, context));
    if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
    // Merely matching an id is insufficient: notification/email-log ids are not
    // user ids. An own-profile exemption applies to this object only, not children.
    const self = ['admin', 'dietitian', 'client'].includes(value.role)
      && idOf(value) != null && String(idOf(value)) === String(idOf(viewer));
    const envelope = EMAIL_ENVELOPES.has(context)
      || (typeof value.templateKey === 'string' && ('to' in value || 'status' in value));
    return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
      const field = normalizedKey(key);
      const ownEmail = self && (field === 'email' || field === 'emailaddress');
      const ownPhone = self && ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'telephone'].includes(field);
      if (!showEmail && EMAIL_KEYS.has(field) && !ownEmail) return [];
      if (!showPhone && PHONE_KEYS.has(field) && !ownPhone) return [];
      if (!showEmail && ADDRESS_FIELDS.has(field) && envelope) return [];
      return [[key, visit(child, field)]];
    }));
  }
  return visit(payload);
}
