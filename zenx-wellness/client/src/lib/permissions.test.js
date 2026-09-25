import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessPortal, creatableRoles, canEditAccount, canResetAccount, contactEditPatch,
  permissionEditorLocked, permissionDraftAfterToggle, mayChangeEnquiryStatus,
  getDefaultPermissions, getEffectivePermissions, PERMISSION_DEFINITIONS,
} from './permissions.js';

const admin = { _id: 'admin', role: 'admin', permissionsConfigured: true };
const dietitian = { _id: 'dietitian', role: 'dietitian' };
const owner = { ...admin, _id: 'owner', isMainAdmin: true };
const client = { _id: 'client', role: 'client', assignedDietitian: 'dietitian' };
const restricted = (user, patch) => ({ ...user, permissions: { ...getDefaultPermissions(user.role), ...patch } });

test('staff routes and direct URLs follow capability restrictions; client routes remain their own', () => {
  const viewer = restricted(admin, { 'diet_plans.view': false, 'messages.use': false, 'clients.view': false });
  assert.equal(canAccessPortal(viewer, '/practice/app/plan'), false);
  assert.equal(canAccessPortal(viewer, '/practice/app/clients/client'), false);
  assert.equal(canAccessPortal(viewer, '/practice/app/messages'), false);
  assert.equal(canAccessPortal(viewer, '/practice/app/overview'), true);
  assert.equal(canAccessPortal(client, '/practice/app/meals'), true);
  assert.equal(canAccessPortal(client, '/practice/app/users'), false);
  assert.equal(canAccessPortal(client, '/practice/app/permissions'), false);
  assert.equal(canAccessPortal(dietitian, '/practice/app/users/dietitians/other'), false);
  assert.equal(canAccessPortal(restricted(admin, { 'staff.view': false }), '/practice/app/users/dietitians/other'), false);
});

test('permission setup is visible to admins before explicit main-admin selection', () => {
  assert.equal(canAccessPortal({ ...admin, permissionsConfigured: false }, '/app/permissions'), true);
  assert.equal(canAccessPortal(admin, '/app/permissions'), false);
  assert.equal(canAccessPortal(owner, '/app/permissions'), true);
  assert.equal(canAccessPortal(restricted(admin, { 'permissions.manage': true }), '/app/permissions'), true);
});

test('dietitians need explicit grants to create clients or generate passwords and never create staff', () => {
  assert.deepEqual(creatableRoles(dietitian), []);
  const granted = restricted(dietitian, { 'clients.create': true, 'users.reset_password': true });
  assert.deepEqual(creatableRoles(granted), ['client']);
  assert.equal(canResetAccount(granted, client), true);
  assert.equal(canResetAccount(granted, { ...client, assignedDietitian: 'other' }), false);
  assert.equal(canResetAccount(granted, admin), false);
  assert.equal(canResetAccount(dietitian, client), false);
  assert.deepEqual(creatableRoles(restricted(admin, { 'staff.create_dietitian': false, 'staff.create_admin': false })), ['client']);
});

test('account edit/reset protections cover owner, self, permission managers and higher privilege peers', () => {
  const manager = restricted({ ...admin, _id: 'manager' }, { 'permissions.manage': true });
  assert.equal(canEditAccount(admin, owner), false);
  assert.equal(canResetAccount(admin, owner), false);
  assert.equal(canResetAccount(admin, admin), false);
  assert.equal(canEditAccount(admin, manager), false);
  assert.equal(canResetAccount(admin, manager), false);
  assert.equal(canEditAccount(owner, manager), true);
  assert.equal(canResetAccount(owner, manager), true);
  assert.equal(canEditAccount(restricted(admin, { 'recipes.manage': false }), dietitian), false);
});

test('hidden contacts are omitted from edit payloads, while visible empty phone may intentionally clear', () => {
  assert.deepEqual(contactEditPatch({ email: '', phone: '' }, client), {});
  assert.deepEqual(contactEditPatch({ email: 'new@example.test', phone: '' }, { ...client, email: 'old@example.test' }), { email: 'new@example.test' });
  assert.deepEqual(contactEditPatch({ phone: '' }, { ...client, phone: null }), { phone: '' });
});

test('delegates cannot edit themselves, another manager, or owner', () => {
  const manager = restricted({ ...admin, _id: 'manager' }, { 'permissions.manage': true });
  assert.equal(permissionEditorLocked(manager, manager), true);
  assert.equal(permissionEditorLocked(manager, owner), true);
  assert.equal(permissionEditorLocked(manager, { ...manager, _id: 'another' }), true);
  assert.equal(permissionEditorLocked(manager, dietitian), false);
  assert.equal(permissionEditorLocked(owner, manager), false);
});

test('permission editor enabling writes recursively enables dependencies and viewing off cascades', () => {
  const empty = Object.fromEntries(PERMISSION_DEFINITIONS.map(({ key }) => [key, false]));
  const enabled = permissionDraftAfterToggle(empty, 'diet_plans.edit', true, PERMISSION_DEFINITIONS);
  assert.equal(enabled['diet_plans.edit'], true);
  assert.equal(enabled['diet_plans.view'], true);
  assert.equal(enabled['clients.view'], true);
  assert.deepEqual(getEffectivePermissions({ ...admin, permissions: enabled }), enabled);
  const disabled = permissionDraftAfterToggle(enabled, 'clients.view', false, PERMISSION_DEFINITIONS);
  assert.equal(disabled['diet_plans.edit'], false);
  assert.equal(disabled['diet_plans.view'], false);
  assert.equal(Object.keys(disabled).length, PERMISSION_DEFINITIONS.length);
});

test('enquiry transitions require their related call or client permissions', () => {
  assert.equal(mayChangeEnquiryStatus(restricted(admin, { 'calls.manage': false }), {}, 'follow-up'), false);
  assert.equal(mayChangeEnquiryStatus(restricted(admin, { 'clients.create': false }), {}, 'converted'), false);
  assert.equal(mayChangeEnquiryStatus(restricted(admin, { 'clients.edit': false }), { convertedUserId: 'client' }, 'closed'), false);
  assert.equal(mayChangeEnquiryStatus(admin, {}, 'contacted'), true);
});
