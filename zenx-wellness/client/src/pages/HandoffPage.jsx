import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { getPortalHome } from '@/lib/portalHome';

// Landing point for admin-server's issued SSO link (`${application.url}/${company_slug}/handoff
// ?token=...` — see issueHandoffToken in the ZenX admin-server repo). :companySlug isn't read here:
// the token itself carries company_id/company_slug and the server (auth.controller.js#handoff) is
// what actually scopes the resulting account to that org — the URL segment is only there to match
// admin-server's redirect shape, not a second source of truth for which company this is. The
// post-login redirect below uses the resolved user's own companySlug, not this URL param, for the
// same reason.
export function HandoffPage() {
  useParams();
  const [searchParams] = useSearchParams();
  const { completeHandoff } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setError('This login link is missing its token.');
      return;
    }

    completeHandoff(token)
      .then((user) => navigate(getPortalHome(user.role, user.companySlug), { replace: true }))
      .catch(() => setError('This login link is invalid or has expired. Please sign in again from ZenX.'));
  }, [searchParams, completeHandoff, navigate]);

  return (
    <AuthLayout eyebrow="ZENX SSO" title="Signing you in…" subtitle={error ?? 'One moment while we verify your login.'}>
      {error && (
        <button
          type="button"
          onClick={() => navigate('/login', { replace: true })}
          className="mt-2 w-full rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral/90"
        >
          Go to login
        </button>
      )}
    </AuthLayout>
  );
}
