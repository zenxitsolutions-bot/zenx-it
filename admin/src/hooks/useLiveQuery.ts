import { useCallback, useEffect, useRef, useState } from "react";
import { isDemoMode } from "../lib/apiClient";
import { demoStore } from "../services/demo/demoStore";

// Live mode used to subscribe to Supabase Realtime `postgres_changes` per table. There's no
// equivalent primitive with a plain Express+MySQL backend, so this polls instead — same UX
// (pages refresh on their own), just on an interval rather than pushed. `options.tables` is
// still accepted (as a no-op) so no call site needs to change.
const POLL_INTERVAL_MS = 8000;

interface LiveQueryOptions {
  /** Supabase table(s) to subscribe to for realtime refresh in live mode. */
  tables?: string[];
}

interface LiveQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLiveQuery<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList = [],
  options: LiveQueryOptions = {}
): LiveQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  // Only the very first fetch (for a given set of deps) should show a loading state. A demo-mode
  // store write anywhere in the app re-runs every live query as a background refresh (see the
  // subscribe effect below) — flipping `loading` back to true on those would make every page's
  // `if (loading || !data) return <Skeleton />` guard unmount its own subtree for an instant,
  // taking any open modal down with it and resetting its state (e.g. a just-submitted form modal
  // popping back to its initial screen right after a successful create).
  const hasLoadedRef = useRef(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    hasLoadedRef.current = false;
  }, deps);

  const run = useCallback(() => {
    if (!hasLoadedRef.current) setLoading(true);
    fetcherRef
      .current()
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        hasLoadedRef.current = true;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    if (isDemoMode) {
      return demoStore.subscribe(run);
    }
    const interval = setInterval(run, POLL_INTERVAL_MS);
    window.addEventListener("focus", run);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", run);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  return { data, loading, error, refresh: run };
}
