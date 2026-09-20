import { Link, useParams } from 'react-router-dom';

export function EnquiryThankYouPage() {
  const { companySlug } = useParams();

  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-[540px] rounded-card border border-line bg-white p-8 text-center shadow-lift min-[520px]:p-12">
        <div className="mx-auto mb-4 grid size-[70px] place-items-center rounded-full bg-sage text-2xl text-brand-strong" aria-hidden="true">
          &#10022;
        </div>
        <p className="text-xs font-semibold tracking-widest text-brand-strong uppercase">Enquiry received</p>
        <h1 className="mt-2 text-3xl font-semibold text-forest">Thank you.</h1>
        <p className="mt-3 text-muted-foreground">
          Your consultation enquiry has been sent. Our team will be in touch soon.
        </p>
        <Link to={`/${companySlug}/enquiry`} className="mt-7 inline-flex rounded-pill bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-brand-strong">
          Send another enquiry
        </Link>
      </section>
    </main>
  );
}
