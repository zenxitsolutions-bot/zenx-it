import { Loader2 } from 'lucide-react';

// Suspense fallback shown while a lazy-loaded route chunk downloads — brief on a warm cache,
// visible on the first visit to a given route.
export function PageLoadingFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream">
      <Loader2 className="size-6 animate-spin text-sage-deep" aria-label="Loading" />
    </div>
  );
}
