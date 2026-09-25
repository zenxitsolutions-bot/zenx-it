export {
  PERMISSION_DEFINITIONS, hasPermission, isMainAdmin, getEffectivePermissions, getDefaultPermissions, permissionIdentity,
} from '../../../shared/permissions.js';
import { hasPermission, isMainAdmin, getEffectivePermissions } from '../../../shared/permissions.js';

const ROUTE_PERMISSIONS = {
  clients: ['clients.view'], plan: ['diet_plans.view'], 'saved-plans': ['diet_plans.view'],
  recipes: ['recipes.view'], calls: ['calls.view'], messages: ['messages.use'], support: ['messages.use'],
  reports: ['reports.view'], enquiries: ['enquiries.view'], plans: ['program_plans.view'],
  insights: ['insights.view'], 'email-log': ['email_logs.view'], organisation: ['organisation.view'],
  users: ['staff.view', 'clients.create', 'clients.edit', 'users.reset_password'],
};

export function canAccessPortal(user, path) {
  if (!user) return false;
  const parts = path.replace(/^.*\/app\/?/, '').split('/');
  const section = parts[0];
  if (user.role === 'client') return ['overview', 'meals', 'progress', 'calls', 'messages', 'reports'].includes(section);
  if (section === 'permissions') return user.role === 'admin' && (
    isMainAdmin(user) || hasPermission(user, 'permissions.manage') || user.permissionsConfigured === false
  );
  if (section === 'overview') return true;
  if (section === 'users' && parts[1] === 'dietitians') return user.role === 'admin' && hasPermission(user, 'staff.view');
  return (ROUTE_PERMISSIONS[section] ?? []).some((key) => hasPermission(user, key));
}

export function creatableRoles(user) {
  return [
    hasPermission(user, 'clients.create') && 'client',
    user?.role === 'admin' && hasPermission(user, 'staff.create_dietitian') && 'dietitian',
    user?.role === 'admin' && hasPermission(user, 'staff.create_admin') && 'admin',
  ].filter(Boolean);
}

export function canEditAccount(viewer, target) {
  if (!target || target.isMainAdmin || (target._id === viewer?._id && !isMainAdmin(viewer))) return false;
  if (target.role === 'client') return hasPermission(viewer, 'clients.edit') && (viewer.role === 'admin' || target.assignedDietitian === viewer._id);
  return viewer?.role === 'admin' && hasPermission(viewer, 'staff.edit') && (
    isMainAdmin(viewer) || (!hasPermission(target, 'permissions.manage') && !hasHigherPermissions(viewer, target))
  );
}

export function canResetAccount(viewer, target) {
  return target && target._id !== viewer?._id && !target.isMainAdmin
    && hasPermission(viewer, 'users.reset_password')
    && ((target.role === 'client' && (viewer.role === 'admin' || target.assignedDietitian === viewer._id)) || (viewer?.role === 'admin' && hasPermission(viewer, 'staff.edit')
      && (isMainAdmin(viewer) || (!hasPermission(target, 'permissions.manage') && !hasHigherPermissions(viewer, target)))));
}

function hasHigherPermissions(viewer, target) {
  return Object.entries(getEffectivePermissions(target)).some(([key, enabled]) => enabled && !hasPermission(viewer, key));
}

// The API deliberately omits contacts a viewer cannot see. Never turn an omitted value into
// an empty string/null update; otherwise a harmless account edit could erase that contact.
export function contactEditPatch(values, target) {
  return {
    ...(typeof target.email === 'string' ? { email: values.email } : {}),
    ...(Object.hasOwn(target, 'phone') ? { phone: values.phone } : {}),
  };
}

export function permissionEditorLocked(viewer, target) {
  return !target || target.isMainAdmin || (!isMainAdmin(viewer) && (
    target._id === viewer?._id || hasPermission(target, 'permissions.manage')
  ));
}

export function mayChangeEnquiryStatus(user, enquiry, status) {
  if (!hasPermission(user, 'enquiries.manage')) return false;
  if (status === 'follow-up' && !hasPermission(user, 'calls.manage')) return false;
  if (status === 'converted' && (!hasPermission(user, 'clients.create')
    || (enquiry.convertedUserId && !hasPermission(user, 'clients.edit')))) return false;
  if (status === 'converted' && !enquiry.convertedUserId && !hasPermission(user, 'program_plans.view')) return false;
  if (status === 'closed' && enquiry.convertedUserId && !hasPermission(user, 'clients.edit')) return false;
  return true;
}

export function permissionDraftAfterToggle(previous, key, enabled, definitions) {
  const next = { ...previous, [key]: enabled };
  if (enabled) {
    const visited = new Set();
    function addRequirements(permission) {
      if (visited.has(permission)) return;
      visited.add(permission);
      for (const required of definitions.find((entry) => entry.key === permission)?.requires ?? []) {
        next[required] = true;
        addRequirements(required);
      }
    }
    addRequirements(key);
  } else {
    let updated = true;
    while (updated) {
      updated = false;
      for (const item of definitions) {
        if (next[item.key] && (item.requires ?? []).some((required) => !next[required])) {
          next[item.key] = false;
          updated = true;
        }
      }
    }
  }
  return next;
}
