import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import { useLiveQuery } from "./useLiveQuery";
import { adminUsersService } from "../services/adminUsers";
import { enquiriesService } from "../services/enquiries";
import { ScheduleFollowupModal } from "../components/enquiries/ScheduleFollowupModal";
import { ConvertFlow } from "../components/enquiries/ConvertFlow";
import type { Enquiry, EnquiryStatus } from "../types/domain";

export function useEnquiryWorkflow(onChanged: () => void) {
  const { profile } = useAuth();
  const { confirm } = useConfirm();
  const { toast } = useToast();
  const { data: admins } = useLiveQuery(() => adminUsersService.list(), []);
  const [followupTarget, setFollowupTarget] = useState<Enquiry | null>(null);
  const [convertTarget, setConvertTarget] = useState<Enquiry | null>(null);

  const changeStatus = async (enquiry: Enquiry, status: EnquiryStatus) => {
    if (!profile || status === enquiry.status) return;

    if (status === "FOLLOW_UP") {
      setFollowupTarget(enquiry);
      return;
    }

    if (status === "LOST") {
      const ok = await confirm({
        title: "Mark this enquiry as lost?",
        description: `${enquiry.company_name} will be moved to Lost. You can find it later with the Lost filter.`,
        confirmLabel: "Mark Lost",
        danger: true,
      });
      if (!ok) return;
      await enquiriesService.updateStatus(enquiry.id, "LOST", profile.id);
      toast("Enquiry updated");
      onChanged();
      return;
    }

    if (status === "CONVERTED") {
      await enquiriesService.updateStatus(enquiry.id, "CONVERTED", profile.id);
      onChanged();
      setConvertTarget({ ...enquiry, status: "CONVERTED" });
      return;
    }

    await enquiriesService.updateStatus(enquiry.id, status, profile.id);
    toast("Enquiry updated");
    onChanged();
  };

  const modals = (
    <>
      <ScheduleFollowupModal
        open={Boolean(followupTarget)}
        enquiry={followupTarget}
        admins={admins ?? []}
        currentAdminId={profile?.id ?? ""}
        onClose={() => setFollowupTarget(null)}
        onScheduled={async () => {
          if (followupTarget && profile) {
            await enquiriesService.updateStatus(followupTarget.id, "FOLLOW_UP", profile.id);
          }
          setFollowupTarget(null);
          toast("Follow-up scheduled");
          onChanged();
        }}
      />
      <ConvertFlow
        enquiry={convertTarget}
        onClose={(created) => {
          setConvertTarget(null);
          if (created) toast("Customer created");
          onChanged();
        }}
      />
    </>
  );

  return { changeStatus, modals };
}
