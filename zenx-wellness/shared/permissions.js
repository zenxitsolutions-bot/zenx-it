// Shared browser/API vocabulary. A role defines eligible capabilities and initial defaults;
// only persisted, server-loaded overrides can change authorization on the API.
const staff = ['admin', 'dietitian'];
const admin = ['admin'];
const define = (key, label, group, roles = staff, dietitian = true, requires = [], description = '') => ({
  key, label, group, roles, defaults: { admin: key !== 'permissions.manage', dietitian }, requires, description,
});

export const PERMISSION_DEFINITIONS = [
  define('contact.view_email', 'See email addresses', 'Contact details'),
  define('contact.view_phone', 'See phone numbers', 'Contact details'),
  define('clients.view', 'View clients', 'Clients'),
  define('clients.edit', 'Edit client details', 'Clients', staff, true, ['clients.view']),
  define('clients.create', 'Create client accounts', 'Clients', staff, false, ['clients.view']),
  define('staff.view', 'View staff accounts', 'Staff', admin, false),
  define('staff.create_dietitian', 'Create dietitian accounts', 'Staff', admin, false, ['staff.view']),
  define('staff.create_admin', 'Create admin accounts', 'Staff', admin, false, ['staff.view']),
  define('staff.edit', 'Edit staff accounts', 'Staff', admin, false, ['staff.view']),
  define('users.reset_password', 'Generate/reset temporary passwords', 'Accounts', staff, false, ['clients.view'], 'Dietitians can reset only their assigned clients. Protected administrators cannot be reset by a subordinate.'),
  define('diet_plans.view', 'View diet plans', 'Diet plans', staff, true, ['clients.view']),
  define('diet_plans.edit', 'Create and edit diet plans', 'Diet plans', staff, true, ['diet_plans.view']),
  define('diet_plans.publish', 'Publish diet plans', 'Diet plans', staff, true, ['diet_plans.view']),
  define('diet_plans.delete', 'Delete diet plans', 'Diet plans', staff, true, ['diet_plans.view']),
  define('recipes.view', 'View recipe library', 'Recipes'),
  define('recipes.manage', 'Create and edit custom recipes', 'Recipes', staff, true, ['recipes.view']),
  define('reports.view', 'View client reports', 'Reports', staff, true, ['clients.view']),
  define('reports.review', 'Review client reports', 'Reports', staff, true, ['reports.view']),
  define('calls.view', 'View calls and schedules', 'Calls', staff, true, ['clients.view']),
  define('calls.manage', 'Book and change calls/schedules', 'Calls', staff, true, ['calls.view']),
  define('messages.use', 'Use messages', 'Messages', staff, true, ['clients.view']),
  define('enquiries.view', 'View enquiry pipeline', 'Enquiries', admin, false),
  define('enquiries.manage', 'Manage enquiries', 'Enquiries', admin, false, ['enquiries.view']),
  define('program_plans.view', 'View program packages', 'Program packages', staff, true),
  define('program_plans.manage', 'Manage program packages', 'Program packages', admin, false, ['program_plans.view']),
  define('insights.view', 'View growth insights', 'Organisation', staff, true),
  define('email_logs.view', 'View email delivery logs', 'Organisation', admin, false, ['contact.view_email']),
  define('organisation.view', 'View organisation details', 'Organisation', admin, false),
  define('permissions.manage', 'Manage other users’ permissions', 'Permission administration', admin, false, ['staff.view', 'clients.view'], 'Only the main admin can appoint or remove permission managers. Managers cannot change themselves, the main admin, or another manager, or grant access they do not have.'),
];

export const PERMISSION_KEYS = PERMISSION_DEFINITIONS.map(({ key }) => key);
export const isMainAdmin = (user) => user?.role === 'admin' && user?.isMainAdmin === true;

export function getDefaultPermissions(role) {
  return Object.fromEntries(PERMISSION_DEFINITIONS.map((definition) => [definition.key,
    definition.roles.includes(role) && Boolean(definition.defaults[role]) ]));
}

export function getEffectivePermissions(user) {
  if (isMainAdmin(user)) return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, true]));
  const result = getDefaultPermissions(user?.role);
  const overrides = user?.permissionOverrides ?? user?.permissions;
  if (overrides && typeof overrides === 'object' && !Array.isArray(overrides)) {
    for (const definition of PERMISSION_DEFINITIONS) {
      if (typeof overrides[definition.key] === 'boolean') {
        result[definition.key] = definition.roles.includes(user?.role) && overrides[definition.key];
      }
    }
  }
  // Dependencies are restrictive, never implicit grants. Turning viewing off also disables writes.
  for (let pass = 0; pass < PERMISSION_DEFINITIONS.length; pass += 1) {
    let changed = false;
    for (const { key, requires } of PERMISSION_DEFINITIONS) {
      if (result[key] && requires.some((dependency) => !result[dependency])) { result[key] = false; changed = true; }
    }
    if (!changed) break;
  }
  return result;
}

export function hasPermission(user, key) {
  return PERMISSION_KEYS.includes(key) && getEffectivePermissions(user)[key] === true;
}

export function permissionIdentity(user) {
  return JSON.stringify([user?.isMainAdmin === true, user?.permissionsConfigured === true, getEffectivePermissions(user)]);
}
