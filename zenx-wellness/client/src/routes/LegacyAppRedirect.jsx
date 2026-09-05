import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Preserves bare /app/... links/bookmarks from before company-slug URLs existed (router.jsx's
// '/app' and '/app/*' routes) — redirects to the same sub-path under the logged-in user's own
// slug instead of 404ing them.
export function LegacyAppRedirect() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Navigate to={`/${user.companySlug}${location.pathname}${location.search}`} replace />;
}
