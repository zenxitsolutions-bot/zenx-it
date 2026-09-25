import { PERMISSION_DEFINITIONS, hasPermission } from '../../../shared/permissions.js';
import { getCompanyAccessControl, hydrateManyUserPermissions, setUserPermissions, hydrateUserPermissions } from '../models/AccessControl.js';
import { listUsers, findUserById } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

export const getPermissions = asyncHandler(async (req, res) => {
  const control = await getCompanyAccessControl(req.user.companyId);
  if (!control) return res.json({ definitions: PERMISSION_DEFINITIONS, users: [], ownerId: null, configured: false });
  if (!hasPermission(req.user, 'permissions.manage')) throw ApiError.forbidden('Only an authorized admin can manage permissions');
  const users = await listUsers({ companyId: req.user.companyId });
  const staff = await hydrateManyUserPermissions(users.filter((user) => ['admin', 'dietitian'].includes(user.role)));
  res.json({ definitions: PERMISSION_DEFINITIONS, users: staff.map((user) => toClientShape(user, ['passwordHash', 'refreshTokenVersion'])), ownerId: control.main_admin_user_id, configured: true });
});

export const updatePermissions = asyncHandler(async (req, res) => {
  if (!req.body || Object.keys(req.body).length !== 1 || !req.body.permissions) throw ApiError.badRequest('Only the permissions object may be updated');
  const id = await setUserPermissions(req.user.id, req.params.userId, req.body.permissions);
  const user = await hydrateUserPermissions(await findUserById(id));
  res.json(toClientShape(user, ['passwordHash', 'refreshTokenVersion']));
});
