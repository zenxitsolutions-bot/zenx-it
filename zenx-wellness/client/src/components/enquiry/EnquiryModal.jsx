import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useEnquiryModal } from '@/hooks/useEnquiryModal';
import { useCreateEnquiry } from '@/hooks/useCreateEnquiry';
import { enquirySchema, STEP_FIELDS } from './enquirySchema';
import { ProgressDots } from './ProgressDots';
import { StepGoal } from './StepGoal';
import { StepContact } from './StepContact';
import { StepSchedule } from './StepSchedule';
import { StepSuccess } from './StepSuccess';

const TOTAL_STEPS = 3;
const DEFAULT_VALUES = { goal: '', name: '', email: '', phone: '', preferredSlot: '', note: '' };

export function EnquiryModal() {
  const { isOpen, closeEnquiry } = useEnquiryModal();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const createEnquiry = useCreateEnquiry();

  const form = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const goal = form.watch('goal');

  function resetAfterClose() {
    setStep(1);
    setSubmitted(false);
    form.reset(DEFAULT_VALUES);
    createEnquiry.reset();
  }

  function handleOpenChange(open) {
    if (open) return;
    closeEnquiry();
    setTimeout(resetAfterClose, 200);
  }

  async function handleContinue() {
    if (step < TOTAL_STEPS) {
      const valid = await form.trigger(STEP_FIELDS[step]);
      if (valid) setStep((s) => s + 1);
      return;
    }

    const valid = await form.trigger(STEP_FIELDS[step]);
    if (!valid) return;

    createEnquiry.mutate(form.getValues(), {
      onSuccess: () => setSubmitted(true),
      onError: () => toast.error("We couldn't send that — please try again."),
    });
  }

  const continueDisabled = (step === 1 && !goal) || createEnquiry.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(540px,100%)] gap-0 rounded-[19px] p-9 sm:max-w-none">
        <DialogTitle className="sr-only">Book a free consultation</DialogTitle>

        {!submitted && <ProgressDots step={step} total={TOTAL_STEPS} />}

        <Form {...form}>
          <AnimatePresence mode="wait" initial={false}>
            {submitted ? (
              <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <StepSuccess onClose={() => handleOpenChange(false)} />
              </motion.div>
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {step === 1 && <StepGoal value={goal} onSelect={(g) => form.setValue('goal', g, { shouldValidate: true })} />}
                {step === 2 && <StepContact form={form} />}
                {step === 3 && <StepSchedule form={form} />}
              </motion.div>
            )}
          </AnimatePresence>
        </Form>

        {!submitted && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              className="text-sm font-semibold text-forest hover:underline"
              onClick={() => handleOpenChange(false)}
            >
              Maybe later
            </button>
            <Button
              onClick={handleContinue}
              disabled={continueDisabled}
              className="rounded-full bg-coral text-white hover:bg-coral/90"
            >
              {createEnquiry.isPending ? 'Sending…' : step === TOTAL_STEPS ? 'Send my enquiry' : 'Continue →'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
