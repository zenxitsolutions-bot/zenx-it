/**
 * The permission catalog. Seeded into `permissions` once and shared by every
 * tenant; roles are per company and select from this list.
 *
 * Keys are `<category>.<action>` and are what `authorize()` is given.
 */

const CATEGORIES = [
  { key: 'clients', label: 'Clients', actions: ['view', 'create', 'edit', 'deactivate', 'assign'] },
  { key: 'dietitians', label: 'Dietitians', actions: ['view', 'create', 'edit', 'deactivate'] },
  { key: 'trainers', label: 'Trainers', actions: ['view', 'create', 'edit', 'deactivate'] },
  {
    key: 'appointments',
    label: 'Appointments',
    actions: ['view', 'create', 'edit', 'deactivate', 'cancel', 'manage_availability'],
  },
  { key: 'diet_plans', label: 'Diet Plans', actions: ['view', 'create', 'edit', 'deactivate', 'assign'] },
  { key: 'workout_plans', label: 'Workout Plans', actions: ['view', 'create', 'edit', 'deactivate', 'assign'] },
  { key: 'payments', label: 'Payments', actions: ['view', 'create', 'edit', 'deactivate'] },
  {
    key: 'users',
    label: 'Users',
    actions: ['view', 'create', 'edit', 'deactivate', 'activate', 'reset_password'],
  },
  { key: 'roles', label: 'Roles', actions: ['view', 'create', 'edit', 'deactivate', 'assign_permissions'] },
  // Enquiries are a customer-side pipeline of their own; without this the
  // module would have no gate at all.
  { key: 'enquiries', label: 'Enquiries', actions: ['view', 'create', 'edit', 'deactivate', 'assign'] },
  // Recipes and exercises are CRUD resources of their own; without these they
  // would inherit no gate at all.
  { key: 'recipes', label: 'Recipes', actions: ['view', 'create', 'edit', 'deactivate'] },
  { key: 'exercises', label: 'Exercises', actions: ['view', 'create', 'edit', 'deactivate'] },
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
]

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  deactivate: 'Deactivate',
  activate: 'Activate',
  assign: 'Assign',
  cancel: 'Cancel',
  manage_availability: 'Manage availability',
  reset_password: 'Reset password',
  assign_permissions: 'Assign permissions',
}

export const PERMISSIONS = CATEGORIES.flatMap((category) =>
  category.actions.map((action) => ({
    key: `${category.key}.${action}`,
    category: category.key,
    action,
    label: `${ACTION_LABELS[action]} ${category.label}`,
  })),
)

export const PERMISSION_KEYS = PERMISSIONS.map((permission) => permission.key)

const keysFor = (...categories) =>
  PERMISSION_KEYS.filter((key) => categories.includes(key.split('.')[0]))

/**
 * Roles seeded into every new company. Company Admin holds the full catalog;
 * the rest are sensible starting points a tenant can edit.
 */
export const DEFAULT_ROLES = [
  {
    name: 'Company Admin',
    description: 'Full access to everything in this workspace.',
    isSystem: true,
    permissions: PERMISSION_KEYS,
  },
  {
    name: 'Manager',
    description: 'Runs day-to-day operations across clients, staff and scheduling.',
    isSystem: true,
    permissions: [
      ...keysFor('clients', 'dietitians', 'trainers', 'appointments', 'enquiries', 'dashboard'),
      ...keysFor('diet_plans', 'workout_plans', 'recipes', 'exercises'),
      'payments.view',
      'users.view',
      'roles.view',
    ],
  },
  {
    name: 'Dietitian',
    description: 'Manages assigned clients and their diet plans.',
    isSystem: true,
    permissions: [
      'clients.view',
      'clients.edit',
      'dashboard.view',
      'appointments.view',
      'appointments.create',
      'appointments.edit',
      'appointments.cancel',
      'appointments.manage_availability',
      ...keysFor('diet_plans', 'recipes'),
      'exercises.view',
    ],
  },
  {
    name: 'Trainer',
    description: 'Manages assigned clients and their workout plans.',
    isSystem: true,
    permissions: [
      'clients.view',
      'clients.edit',
      'dashboard.view',
      'appointments.view',
      'appointments.create',
      'appointments.edit',
      'appointments.cancel',
      'appointments.manage_availability',
      ...keysFor('workout_plans', 'exercises'),
      'recipes.view',
    ],
  },
  {
    name: 'Receptionist',
    description: 'Handles the front desk: enquiries, bookings and payments.',
    isSystem: true,
    permissions: [
      'clients.view',
      'clients.create',
      'clients.edit',
      'dashboard.view',
      ...keysFor('enquiries'),
      'appointments.view',
      'appointments.create',
      'appointments.edit',
      'appointments.cancel',
      'payments.view',
      'payments.create',
    ],
  },
  {
    name: 'Client',
    description: 'End client access to their own plans and appointments.',
    isSystem: true,
    permissions: ['appointments.view', 'diet_plans.view', 'workout_plans.view', 'recipes.view', 'exercises.view'],
  },
]

/** Maps the coarse SystemRole enum onto the default role seeded per company. */
export const SYSTEM_ROLE_TO_DEFAULT_ROLE = {
  COMPANY_ADMIN: 'Company Admin',
  MANAGER: 'Manager',
  DIETITIAN: 'Dietitian',
  TRAINER: 'Trainer',
  RECEPTIONIST: 'Receptionist',
  CLIENT: 'Client',
}
