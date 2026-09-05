import { Button } from '@/components/ui/button';

export function StepSuccess({ onClose }) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto mb-4 grid size-[70px] place-items-center rounded-full bg-sage text-2xl text-forest">
        ✦
      </div>
      <p className="text-xs font-bold tracking-widest text-sage-deep">YOU'RE ALL SET</p>
      <h2 className="mt-2 mb-2 text-2xl">You're one step closer to your wellness goal.</h2>
      <p className="text-sm text-muted-foreground">Our team will contact you soon. We're excited to meet you!</p>
      <Button onClick={onClose} className="mt-6 w-full rounded-full bg-forest text-white hover:bg-forest/90">
        Back to Nourishly
      </Button>
    </div>
  );
}
