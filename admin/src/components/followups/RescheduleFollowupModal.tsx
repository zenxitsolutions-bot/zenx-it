import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FollowupScheduleFields } from "../shared/FollowupScheduleFields";
import { followupsService } from "../../services/followups";
import { useToast } from "../../context/ToastContext";
import { browserTimezone } from "../../lib/timezone";
import type { Followup, Profile } from "../../types/domain";

interface RescheduleFollowupModalProps {
  open: boolean;
  followup: Followup | null;
  /** The admin this follow-up is assigned to, so the fields can preview the time in their zone. */
  assignee?: Profile;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Replaces the two chained `window.prompt()` calls this action used to use. Beyond looking dated,
 * `prompt` blocks the whole tab, accepts any string (so a typo silently became an invalid date),
 * offers no timezone control at all, and can't be dismissed with Escape without losing the first
 * value. This reuses the same FollowupScheduleFields the create flow uses, so a reschedule now
 * gets identical validation and the same cross-timezone preview.
 */
export function RescheduleFollowupModal({
  open,
  followup,
  assignee,
  onClose,
  onSaved,
}: RescheduleFollowupModalProps) {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timezone, setTimezone] = useState(browserTimezone());
  const [saving, setSaving] = useState(false);

  // Re-seed whenever a different follow-up is opened, otherwise the second dialog would still be
  // showing the first one's values.
  useEffect(() => {
    if (!followup) return;
    setDate(followup.scheduled_date?.slice(0, 10) ?? "");
    setTime(followup.scheduled_time?.slice(0, 5) ?? "");
    setTimezone(followup.timezone || browserTimezone());
  }, [followup]);

  if (!followup) return null;

  const valid = Boolean(date && time);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await followupsService.reschedule(followup.id, date, time, timezone);
      toast("Follow-up rescheduled");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reschedule follow-up"
      subtitle="Pick a new date and time. The assignee is notified by the existing reminder job."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!valid || saving}>
            {saving ? "Saving…" : "Reschedule"}
          </Button>
        </>
      }
    >
      <FollowupScheduleFields
        idPrefix={`reschedule-${followup.id}`}
        date={date}
        onDateChange={setDate}
        time={time}
        onTimeChange={setTime}
        timezone={timezone}
        onTimezoneChange={setTimezone}
        assigneeTimezone={assignee?.timezone}
        assigneeLabel={assignee ? `${assignee.first_name} ${assignee.last_name}` : undefined}
      />
    </Modal>
  );
}
