import { Button } from '@/components/ui/button';

// `onClose` is optional. The modal passes its close handler; the public /:companySlug/enquiry page
// passes nothing, because there is no modal to dismiss and the lead has nowhere to be sent back
// to. Without it the button is omitted rather than rendered inert.
export function StepSuccess({ onClose, closeLabel = 'Back to ZenX Dietitian' }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-4 grid size-[70px] place-items-center rounded-full bg-sage text-2xl text-brand-strong">
        ✦
      </div>
      <p className="text-xs font-semibold tracking-widest text-brand-strong uppercase">You're all set</p>
      <h2 className="mt-2 mb-2 text-2xl font-semibold text-forest">
        You're one step closer to your wellness goal.
      </h2>
      <p className="text-sm text-muted-foreground">Our team will contact you soon. We're excited to meet you!</p>
      {onClose && (
        <Button onClick={onClose} size="lg" className="mt-6 w-full rounded-pill">
          {closeLabel}
        </Button>
      )}
    </div>
  );
}
