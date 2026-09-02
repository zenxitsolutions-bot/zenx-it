import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { useAuth } from '@/hooks/useAuth';
import { getPortalHome } from '@/lib/portalHome';

// Landing point for admin-server's issued SSO link (`${application.url}/${company_slug}/handoff
// ?token=...`). The URL slug is sent with the token so the server can refuse a token that belongs
// to a different tenant (auth.controller.js#handoff). The post-login redirect still uses the
// resolved user's own companySlug.
export function HandoffPage() {
  const { companySlug } = useParams();
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

    completeHandoff(token, companySlug)
      .then((user) => navigate(getPortalHome(user.role, user.companySlug), { replace: true }))
      .catch(() => setError('This login link is invalid or has expired. Please sign in again from ZenX.'));
  }, [searchParams, completeHandoff, navigate, companySlug]);

  return (
    <AuthLayout eyebrow="ZENX SSO" title="Signing you in…" subtitle={error ?? 'One moment while we verify your login.'}>
      {error && (
        <button
          type="button"
          onClick={() => navigate(companySlug ? `/${companySlug}/login` : '/login', { replace: true })}
          className="mt-2 w-full rounded-full bg-coral px-4 py-2 text-sm font-semibold text-white hover:bg-coral/90"
        >
          Go to login
        </button>
      )}
    </AuthLayout>
  );
}
