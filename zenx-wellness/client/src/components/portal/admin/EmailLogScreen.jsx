import { useState } from 'react';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { formatDateTime } from '@/lib/format';
import { useEmailLogs, useResendEmailLog } from '@/hooks/useEmailLogs';

const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
];

// destructive/secondary/outline are the Badge component's existing variants (see
// components/ui/badge.jsx) — no new variant added just for this screen.
const STATUS_BADGE_VARIANT = { queued: 'outline', sending: 'outline', sent: 'secondary', failed: 'destructive' };

export function EmailLogScreen() {
  const [status, setStatus] = useState(undefined);
  const [expandedId, setExpandedId] = useState(null);
  const { data, isLoading, isError, refetch } = useEmailLogs(status ? { status } : undefined);
  const resend = useResendEmailLog();

  function handleResend(row) {
    resend.mutate(row.id, {
      onSuccess: () => toast.success(`Resent to ${row.to}.`),
      onError: (error) => toast.error(error.response?.data?.error ?? "Couldn't resend that email."),
    });
  }

  return (
    <div className="mx-auto max-w-4xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Every email the app has sent or attempted</p>
        <h1 className="mt-1 text-3xl text-forest">Email log</h1>
        <p className="mt-1 text-muted-foreground">Recipient, template, status, and — for a failed send — why, with a way to retry it.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.label}
            type="button"
            size="sm"
            variant={status === f.value ? 'default' : 'outline'}
            onClick={() => setStatus(f.value)}
            className={status === f.value ? 'rounded-full bg-forest text-white hover:bg-forest/90' : 'rounded-full'}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load the email log"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !data?.length ? (
        <EmptyState icon={Mail} title="No emails here" description="Nothing matches this filter yet." />
      ) : (
        <div className="grid gap-2">
          {data.map((row) => (
            <div key={row._id} className="rounded-card bg-white p-4 shadow-soft">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-forest">{row.to}</strong>
                    <Badge variant={STATUS_BADGE_VARIANT[row.status] ?? 'outline'}>{row.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {row.templateKey} · {row.subject ?? '(no subject yet)'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(row.createdAt)} · attempt {row.attempts}/{row.maxAttempts}
                  </p>
                </div>
                {row.status === 'failed' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={resend.isPending}
                    onClick={() => handleResend(row)}
                    className="shrink-0 rounded-full"
                  >
                    Resend
                  </Button>
                )}
              </div>
              {row.error && (
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === row._id ? null : row._id)}
                  className="mt-2 text-left text-xs font-semibold text-destructive hover:underline"
                >
                  {expandedId === row._id ? 'Hide error' : 'Show error'}
                </button>
              )}
              {row.error && expandedId === row._id && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-cream p-3 text-xs whitespace-pre-wrap text-destructive">{row.error}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
