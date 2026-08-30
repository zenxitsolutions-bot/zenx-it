import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getPortalHome } from '@/lib/portalHome';

export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-center">
      <div>
        <Link to="/" className="mb-6 inline-block font-display text-xl text-forest">
          ✦ nourishly
        </Link>
        <p className="text-xs font-bold tracking-widest text-sage-deep">ACCESS RESTRICTED</p>
        <h1 className="mt-2 mb-3 text-6xl text-forest">403</h1>
        <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
          Your account doesn't have access to this page. If this seems wrong, ask your dietitian or admin.
        </p>
        <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
          <Link to={user ? getPortalHome(user.role, user.companySlug) : '/login'}>{user ? 'Back to your portal' : 'Log in'}</Link>
        </Button>
      </div>
    </main>
  );
}
