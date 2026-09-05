import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6 text-center">
      <div>
        <Link to="/" className="mb-6 inline-block font-display text-xl text-forest">
          ✦ nourishly
        </Link>
        <p className="text-xs font-bold tracking-widest text-sage-deep">PAGE NOT FOUND</p>
        <h1 className="mt-2 mb-3 text-6xl text-forest">404</h1>
        <p className="mx-auto mb-6 max-w-sm text-muted-foreground">
          We couldn't find the page you're looking for. It may have moved, or never existed.
        </p>
        <Button asChild className="rounded-full bg-coral text-white hover:bg-coral/90">
          <Link to="/">Back to Nourishly</Link>
        </Button>
      </div>
    </main>
  );
}
