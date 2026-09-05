import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { tenantLoginFromPath } from '@/lib/tenantLogin';

// Expects to be rendered under ProtectedRoute, which guarantees a logged-in user — the null
// check here is a defensive guard against direct/standalone use, not the primary auth gate.
export function RoleRoute({ roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to={tenantLoginFromPath(location.pathname)} replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
