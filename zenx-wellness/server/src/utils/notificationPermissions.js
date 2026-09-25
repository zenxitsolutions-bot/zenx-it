import { hasPermission } from '../../../shared/permissions.js';

const TYPE_PERMISSION = {
  'meal-swap-requested': 'diet_plans.view',
  'meal-swap': 'diet_plans.view',
  'plan-published': 'diet_plans.view',
  'message': 'messages.use',
  'support-message': 'messages.use',
};

export function canViewNotification(user, notification = {}) {
  if (!user || user.role === 'client') return true;
  const permissions = new Set();
  if (TYPE_PERMISSION[notification.type]) permissions.add(TYPE_PERMISSION[notification.type]);
  const path = typeof notification.url === 'string' ? notification.url.split(/[?#]/, 1)[0] : '';
  // URLs may be tenant-prefixed or absolute (push/email links). Match a full
  // module path segment, not coincidental text in a query string or identifier.
  if (/\/app\/(?:meals|plans|meal-plans|diet-plans)(?:\/|$)/.test(path)) permissions.add('diet_plans.view');
  if (/\/app\/(?:calls|availability)(?:\/|$)/.test(path)) permissions.add('calls.view');
  if (/\/app\/(?:messages|support)(?:\/|$)/.test(path)) permissions.add('messages.use');
  if (/\/app\/enquiries(?:\/|$)/.test(path)) permissions.add('enquiries.view');
  if (/\/app\/reports(?:\/|$)/.test(path)) permissions.add('reports.view');
  return [...permissions].every((permission) => hasPermission(user, permission));
}
