import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useEnquiryModal } from '@/hooks/useEnquiryModal';
import { EnquiryFlow } from './EnquiryFlow';

export function EnquiryModal() {
  const { isOpen, closeEnquiry, companySlug } = useEnquiryModal();
  // Bumped on close so EnquiryFlow remounts with fresh state next time the modal opens. The form
  // used to be reset imperatively on a timer after the close animation; remounting does the same
  // job without a magic number, and without EnquiryFlow having to expose its internals.
  const [instance, setInstance] = useState(0);

  function handleOpenChange(open) {
    if (open) return;
    closeEnquiry();
    setInstance((n) => n + 1);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(540px,100%)] gap-0 rounded-card p-6 sm:max-w-none min-[520px]:p-9">
        <DialogTitle className="sr-only">Book a free consultation</DialogTitle>
        <EnquiryFlow
          key={instance}
          companySlug={companySlug}
          onDismiss={() => handleOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
