import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { tenantLoginFromPath } from '@/lib/tenantLogin';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    return <Navigate to={tenantLoginFromPath(location.pathname)} state={{ from: location }} replace />;
  }

  // Blocks every route this guard wraps — not just /app/* — until a forced password change is
  // done, so typing any protected URL directly can't bypass it (spec verification requirement).
  //
  // The target is the user's own company-scoped path, so the forced change looks like the rest of
  // their tenant (branded, same URL shape as /:companySlug/login). Comparing against that same
  // computed path — not the bare literal — is what stops this redirecting the slug-scoped page to
  // itself forever. It also self-corrects a hand-typed /other-company/change-password back to the
  // caller's own slug.
  //
  // Falls back to the bare /change-password when the user has no company_slug (the column is
  // nullable); that route still exists at the top level for exactly this case.
  const changePasswordPath = user.companySlug ? `/${user.companySlug}/change-password` : '/change-password';
  if (user.mustChangePassword && location.pathname !== changePasswordPath) {
    return <Navigate to={changePasswordPath} replace />;
  }

  return <Outlet />;
}
