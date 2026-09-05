import { Link, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// Router-level errorElement: catches render/loader throws anywhere in the route tree so a bug
// shows this page instead of React Router's blank default error screen or a white page.
export function ServerErrorPage() {
  const error = useRouteError();

  if (import.meta.env.DEV) console.error(error);

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-center">
      <div>
        <Link to="/" className="mb-6 inline-block font-display text-xl text-forest">
          ✦ nourishly
        </Link>
        <p className="text-xs font-bold tracking-widest text-sage-deep">SOMETHING WENT WRONG</p>
        <h1 className="mt-2 mb-3 text-6xl text-forest">500</h1>
        <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
          We hit a snag loading this page. Try again, or head back to Nourishly.
        </p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} className="rounded-full border-line text-forest">
            Reload
          </Button>
          <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
            <Link to="/">Back to Nourishly</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
