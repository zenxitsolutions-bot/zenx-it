import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEnquiryModal } from '@/hooks/useEnquiryModal';

export function HomePage() {
  const { openEnquiry } = useEnquiryModal();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-xs font-semibold tracking-widest text-brand-strong">NUTRITION THAT FITS YOUR LIFE</p>
      <h1 className="max-w-2xl text-5xl leading-tight font-semibold text-forest">
        Feel good in your body, <em className="font-semibold text-coral not-italic">every day.</em>
      </h1>
      <p className="max-w-md text-muted-foreground">
        The full marketing site is being ported from <code>legacy/index.html</code> in the next phase. This page
        confirms the client scaffold — routing, providers, and design tokens — is wired up.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => openEnquiry()} size="lg" className="rounded-pill">
          Book a free consultation
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-pill">
          <Link to="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
