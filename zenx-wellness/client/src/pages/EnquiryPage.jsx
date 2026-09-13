import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePublicCompany } from '@/hooks/useCompany';
import { EnquiryFlow } from '@/components/enquiry/EnquiryFlow';

// The per-company public funnel: /:companySlug/enquiry.
//
// Unauthenticated by design — this is the page a prospective client lands on from the clinic's own
// marketing, before any account exists. The slug in the URL is the only thing that routes the lead
// to a company, and the server re-resolves it on submit (enquiry.controller.js) rather than
// trusting anything sent from here.
export function EnquiryPage() {
  const { companySlug } = useParams();
  const { data: company, isLoading, isError } = usePublicCompany(companySlug);

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-coral" aria-label="Loading" />
      </div>
    );
  }

  // An unknown slug is shown as a dead end rather than quietly falling back to the default
  // company's form: submitting it would put this person's contact details on the wrong clinic's
  // board, and they would never know. The server enforces the same rule independently.
  if (isError || !company) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-forest">We couldn't find that clinic</h1>
          <p className="mt-2 text-muted-foreground">
            The link you followed doesn't match a clinic we know about. Please double-check it, or
            get in touch with the clinic directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-10">
      <div className="mb-6 flex items-center gap-2.5">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt="" className="size-12 shrink-0 rounded-xl object-contain" />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-coral text-base text-white"
          >
            ✦
          </span>
        )}
        <span className="text-lg font-semibold text-forest">{company.name}</span>
      </div>

      <h1 className="mb-1 max-w-xl text-center text-3xl font-semibold text-forest">
        Book a free consultation
      </h1>
      <p className="mb-7 max-w-md text-center text-muted-foreground">
        Tell us a little about your goal and we'll be in touch.
      </p>

      <div className="w-full max-w-[540px] rounded-card border border-line bg-white p-6 shadow-lift min-[520px]:p-9">
        {/* No onDismiss: there is nothing to dismiss on a page whose only purpose is this form,
            so EnquiryFlow hides its "Maybe later" button. */}
        <EnquiryFlow companySlug={companySlug} />
      </div>
    </main>
  );
}
