import { useEffect, useState } from 'react';
import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Rendered under ProtectedRoute, which guarantees a logged-in user (same convention as
// RoleRoute.jsx).
//
// This is NOT the security boundary, and must never be mistaken for one: it runs in the browser,
// where the user controls everything. The actual isolation is server-side — every controller
// derives the tenant from `req.user.companyId` on the verified access token and never from the
// URL, a query param, or the request body, so typing another company's slug cannot return that
// company's data no matter what this component does.
//
// On a slug mismatch we clear the session (product spec: deny access and terminate the session)
// then send the visitor to that URL's login page — they cannot keep a live session for tenant A
// while looking at tenant B's address bar.
export function CompanySlugGuard() {
  const { user, logout } = useAuth();
  const { companySlug } = useParams();
  const [cleared, setCleared] = useState(false);
  const mismatch = companySlug?.toLowerCase() !== user.companySlug?.toLowerCase();

  useEffect(() => {
    if (!mismatch) return undefined;
    let cancelled = false;
    logout().finally(() => {
      if (!cancelled) setCleared(true);
    });
    return () => {
      cancelled = true;
    };
  }, [mismatch, logout]);

  if (mismatch) {
    if (!cleared) return null;
    return <Navigate to={companySlug ? `/${companySlug}/login` : '/login'} replace />;
  }

  return <Outlet />;
}
