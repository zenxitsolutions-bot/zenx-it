import { Building2, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useMyCompany } from '@/hooks/useCompany';

// Read-only by design. ZenX (admin-server) owns company identity — these values arrive on the SSO
// handoff and are only mirrored here (server: models/Company.js), so an edit form on this screen
// would be overwritten on the org's next login. The note below says so, rather than leaving an
// admin to discover it.
function Row({ label, children, hint }) {
  return (
    <div className="grid gap-1 border-b border-line py-4 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-forest">{label}</dt>
      <dd className="text-sm text-ink">
        {children}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </dd>
    </div>
  );
}

export function OrganisationScreen() {
  const { data: company, isLoading, isError, refetch } = useMyCompany();

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Managed by ZenX</p>
        <h1 className="mt-1 text-3xl text-forest">Your organisation</h1>
        <p className="mt-1 text-muted-foreground">
          The company details your portal is branded with. To change them, contact ZenX — they take
          effect here the next time someone signs in.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-3 rounded-card bg-white p-6 shadow-soft">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-48" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Couldn't load your organisation"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : !company ? (
        <EmptyState
          icon={Building2}
          title="No organisation details yet"
          description="This account isn't linked to a ZenX company yet. Details appear here after the first sign-in through ZenX."
        />
      ) : (
        <div className="rounded-card bg-white px-6 shadow-soft">
          <dl>
            <Row label="Company name">
              <div className="flex items-center gap-2">
                {company.logoUrl && <img src={company.logoUrl} alt="" className="size-8 shrink-0 rounded-md object-cover" />}
                <span className="font-semibold text-forest">{company.name}</span>
              </div>
            </Row>

            <Row label="Company URL" hint="The address your team signs in at.">
              <code className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs text-forest">
                /{company.slug}
              </code>
            </Row>

            <Row label="Website">
              {company.website ? (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-semibold text-forest hover:underline"
                >
                  {company.website}
                  <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-muted-foreground">Not set</span>
              )}
            </Row>
          </dl>
        </div>
      )}
    </div>
  );
}
