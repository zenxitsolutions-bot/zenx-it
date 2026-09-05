import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { toast } from 'sonner';
import { Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useEnquiries, useUpdateEnquiry } from '@/hooks/useEnquiries';
import { STATUS_LABEL } from '@/lib/enquiryStatus';
import { EnquiryColumn } from './EnquiryColumn';
import { EnquiryDetailDrawer } from './EnquiryDetailDrawer';
import { EnquiryContactedDialog } from './EnquiryContactedDialog';
import { EnquiryClosedDialog } from './EnquiryClosedDialog';
import { EnquiryFollowUpDialog } from './EnquiryFollowUpDialog';
import { EnquiryConvertedDialog } from './EnquiryConvertedDialog';

const COLUMNS = Object.keys(STATUS_LABEL).map((status) => ({ status, label: STATUS_LABEL[status] }));

// Statuses that need to collect something (a note, a reason, a schedule) before the transition can
// go through open a dialog instead of firing immediately. 'new' has nothing to collect, so it
// stays an immediate move — matching the existing drag/dropdown behavior for that one status.
// 'converted' — the only status that ever creates a client account (spec §2026-round2-fixes item
// 1) — is special-cased in requestStatusChange below: it only opens a dialog the first time (to
// collect plan/duration/password); re-selecting it on an already-converted enquiry is just a label
// change, same as 'new'.
const DIALOG_FOR_STATUS = {
  contacted: EnquiryContactedDialog,
  closed: EnquiryClosedDialog,
  'follow-up': EnquiryFollowUpDialog,
  converted: EnquiryConvertedDialog,
};

export function EnquiryPipelineScreen() {
  const { data, isLoading, isError, refetch } = useEnquiries();
  const updateEnquiry = useUpdateEnquiry();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));

  const [pendingTransition, setPendingTransition] = useState(null); // { enquiry, status } | null
  const [detailEnquiry, setDetailEnquiry] = useState(null);

  const enquiries = data?.enquiries ?? [];

  function requestStatusChange(enquiry, status) {
    if (status === enquiry.status) return;
    // Converted only needs its dialog (plan/duration/password) the first time an enquiry gets a
    // client account — if Follow-up already created one, this is just a label change.
    const skipDialog = status === 'converted' && Boolean(enquiry.convertedUserId);
    const DialogComponent = skipDialog ? null : DIALOG_FOR_STATUS[status];
    if (DialogComponent) {
      setPendingTransition({ enquiry, status });
      return;
    }
    updateEnquiry.mutate(
      { enquiryId: enquiry._id, status },
      { onError: () => toast.error("That didn't save — please try again.") }
    );
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const enquiry = active.data.current?.enquiry;
    if (!enquiry) return;
    requestStatusChange(enquiry, over.id);
  }

  const PendingDialog = pendingTransition ? DIALOG_FOR_STATUS[pendingTransition.status] : null;

  return (
    <div className="mx-auto max-w-6xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">{enquiries.length} conversations in the pipeline</p>
        <h1 className="mt-1 text-3xl text-forest">Enquiry pipeline</h1>
        <p className="mt-1 text-muted-foreground">Drag a card — or use its dropdown — to keep every person feeling seen.</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title="Couldn't load enquiries"
          description="Something went wrong on our end."
          action={
            <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
              Try again
            </button>
          }
        />
      ) : enquiries.length === 0 ? (
        <EmptyState icon={Inbox} title="No enquiries yet" description="New consultation requests from the website will show up here." />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map(({ status, label }) => (
              <EnquiryColumn
                key={status}
                status={status}
                label={label}
                enquiries={enquiries.filter((e) => e.status === status)}
                pendingId={updateEnquiry.isPending ? updateEnquiry.variables?.enquiryId : null}
                onStatusChange={requestStatusChange}
                onOpenDetail={setDetailEnquiry}
              />
            ))}
          </div>
        </DndContext>
      )}

      {PendingDialog && (
        <PendingDialog
          open={Boolean(pendingTransition)}
          onOpenChange={(open) => !open && setPendingTransition(null)}
          enquiry={pendingTransition.enquiry}
        />
      )}

      <EnquiryDetailDrawer enquiry={detailEnquiry} onOpenChange={(open) => !open && setDetailEnquiry(null)} />
    </div>
  );
}
