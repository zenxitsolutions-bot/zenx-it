import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Video, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGoogleStatus, useConnectGoogle, useDisconnectGoogle } from '@/hooks/useGoogleIntegration';

// Result codes the OAuth callback redirects back with (server/src/controllers/
// integrations.controller.js) — the callback lands on a plain browser redirect, so the outcome
// has to travel in the query string rather than a response body.
const RESULT_MESSAGES = {
  connected: ['success', 'Google Calendar connected — new calls will include a Meet link.'],
  denied: ['error', 'Google access was declined, so calls will not get a Meet link.'],
  expired: ['error', 'That connection attempt timed out. Please try again.'],
  error: ['error', "We couldn't connect Google Calendar. Please try again."],
};

/**
 * Lets a dietitian (or admin) connect the Google account that call invites are created on.
 * Renders nothing at all when the server has no Google credentials configured — there is no point
 * offering a button that cannot work.
 */
export function GoogleCalendarCard() {
  const { data: status, isLoading, refetch } = useGoogleStatus();
  const connect = useConnectGoogle();
  const disconnect = useDisconnectGoogle();
  const [searchParams, setSearchParams] = useSearchParams();

  const result = searchParams.get('google');
  useEffect(() => {
    if (!result) return;
    const [kind, message] = RESULT_MESSAGES[result] ?? RESULT_MESSAGES.error;
    toast[kind](message);
    // Clear the param so a refresh doesn't replay the toast, and re-read status since a successful
    // callback changed it on the server.
    searchParams.delete('google');
    setSearchParams(searchParams, { replace: true });
    refetch();
  }, [result, searchParams, setSearchParams, refetch]);

  if (isLoading || !status?.configured) return null;

  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl">
            <Video className="size-5 text-forest" aria-hidden="true" /> Google Meet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {status.connected
              ? 'Every call you host gets its own Meet link, added to the calendar invite automatically.'
              : 'Connect your Google account to give each call its own Meet link.'}
          </p>
          {status.connected && status.googleEmail && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-sage-deep">
              <Check size={15} aria-hidden="true" /> {status.googleEmail}
            </p>
          )}
        </div>

        {status.connected ? (
          <Button variant="outline" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        ) : (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="rounded-full bg-coral text-white hover:bg-coral/90">
            {connect.isPending ? 'Opening Google…' : 'Connect Google'}
          </Button>
        )}
      </div>

      {!status.connected && (
        <p className="mt-4 text-xs text-muted-foreground">
          Calls booked while disconnected are still scheduled — they just won't carry a meeting link.
        </p>
      )}
    </section>
  );
}
