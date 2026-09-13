import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { useCreateEnquiry } from '@/hooks/useCreateEnquiry';
import { enquirySchema, STEP_FIELDS } from './enquirySchema';
import { ProgressDots } from './ProgressDots';
import { StepGoal } from './StepGoal';
import { StepContact } from './StepContact';
import { StepSchedule } from './StepSchedule';
import { StepSuccess } from './StepSuccess';

const TOTAL_STEPS = 3;
const DEFAULT_VALUES = { goal: '', name: '', email: '', phone: '', preferredSlot: '', note: '' };

// The three-step enquiry form itself, with no opinion about what contains it — the modal wraps it
// in a Dialog, the public /:companySlug/enquiry page wraps it in a page. It was extracted from
// EnquiryModal unchanged so the two funnels can never drift on validation, step order or payload.
//
// `companySlug` decides which company's admin pipeline the lead lands in. Undefined is the bare,
// un-slugged funnel, which the server resolves to its configured default company — so leaving it
// out is a real, supported case, not a missing value to guard against.
//
// `onDismiss` is optional: the modal passes its close handler, the page passes nothing (there is
// nothing to dismiss on a page whose only purpose is this form), and the dismiss button is hidden
// when it's absent.
export function EnquiryFlow({ companySlug, onDismiss, dismissLabel = 'Maybe later' }) {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const createEnquiry = useCreateEnquiry();

  const form = useForm({
    resolver: zodResolver(enquirySchema),
    defaultValues: DEFAULT_VALUES,
  });

  const goal = form.watch('goal');

  async function handleContinue() {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (!valid) return;

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }

    // `companySlug` is spread in only when there is one, rather than sent as an explicit
    // undefined — the server schema treats the key as optional, and an absent key is what the
    // pre-existing bare funnel has always sent.
    createEnquiry.mutate(
      { ...form.getValues(), ...(companySlug ? { companySlug } : {}) },
      {
        onSuccess: () => setSubmitted(true),
        onError: (error) =>
          toast.error(
            error?.response?.status === 404
              ? "We couldn't find that clinic — please check the link you followed."
              : "We couldn't send that — please try again."
          ),
      }
    );
  }

  const continueDisabled = (step === 1 && !goal) || createEnquiry.isPending;

  return (
    <>
      {!submitted && <ProgressDots step={step} total={TOTAL_STEPS} />}

      <Form {...form}>
        <AnimatePresence mode="wait" initial={false}>
          {submitted ? (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StepSuccess onClose={onDismiss} />
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {step === 1 && (
                <StepGoal value={goal} onSelect={(g) => form.setValue('goal', g, { shouldValidate: true })} />
              )}
              {step === 2 && <StepContact form={form} />}
              {step === 3 && <StepSchedule form={form} />}
            </motion.div>
          )}
        </AnimatePresence>
      </Form>

      {!submitted && (
        <div className="mt-6 flex items-center justify-between gap-3">
          {onDismiss ? (
            <button type="button" className="text-sm font-semibold text-forest hover:underline" onClick={onDismiss}>
              {dismissLabel}
            </button>
          ) : (
            // Keeps the primary action hard right in both layouts without a second flex branch.
            <span aria-hidden="true" />
          )}
          <Button onClick={handleContinue} disabled={continueDisabled} className="rounded-pill">
            {createEnquiry.isPending ? 'Sending…' : step === TOTAL_STEPS ? 'Send my enquiry' : 'Continue →'}
          </Button>
        </div>
      )}
    </>
  );
}
