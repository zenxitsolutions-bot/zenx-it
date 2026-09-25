import { findUserById } from '../models/User.js';
import { findCompanyById } from '../models/Company.js';
import { isSessionActive } from '../models/AuthSession.js';
import { hydrateUserPermissions } from '../models/AccessControl.js';
import { hasPermission } from '../../../shared/permissions.js';

// Long-lived HTTP requests must not freeze login authorization at connection time.
// Concurrent events share only an in-flight check; completed decisions are never cached.
export function createLiveSessionGuard(req, {
  findUser = findUserById,
  findCompany = findCompanyById,
  sessionActive = isSessionActive,
  hydratePermissions = hydrateUserPermissions,
  now = Date.now,
} = {}) {
  let pending;
  const expired = () => !Number.isFinite(req.accessTokenExpiresAt) || now() >= req.accessTokenExpiresAt;
  async function check() {
    if (!req.authSession?.id || expired()) return false;
    const user = await findUser(req.user.id);
    if (!user || user.role !== req.user.role || user.companyId !== req.authSession.companyId
      || user.mustChangePassword || user.accountStatus === 'suspended'
      || (user.role === 'client' && user.accountStatus === 'inactive')) return false;
    if (!(await sessionActive({ ...req.authSession, passwordHash: user.passwordHash }))) return false;
    // Revoking messaging closes existing streams as well as rejecting new HTTP requests.
    if (user.role !== 'client' && !hasPermission(await hydratePermissions(user), 'messages.use')) return false;
    if (user.companyId) {
      const company = await findCompany(user.companyId);
      if (!company || company.status !== 'ACTIVE') return false;
    }
    return !expired();
  }
  return () => {
    if (expired()) return Promise.resolve(false);
    if (!pending) pending = check().catch(() => false).finally(() => { pending = null; });
    return pending;
  };
}
