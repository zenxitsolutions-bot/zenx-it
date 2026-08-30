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
// What this does is make the refusal visible. Editing the address bar from /abc-nutrition to
// /xyz-wellness used to silently rewrite the URL back and carry on rendering, which looked like
// the app had honoured the switch and quietly showed "XYZ" data that was really the user's own.
// Sending it to /unauthorized instead states plainly that the tenant was refused, matching the
// 403 the API returns for the same attempt.
export function CompanySlugGuard() {
  const { user } = useAuth();
  const { companySlug } = useParams();

  if (companySlug?.toLowerCase() !== user.companySlug?.toLowerCase()) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
