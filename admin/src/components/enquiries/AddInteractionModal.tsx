import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { FieldWrap, Input, Select, Textarea } from "../ui/Field";
import { Button } from "../ui/Button";
import { FollowupScheduleFields } from "../shared/FollowupScheduleFields";
import { CONTACT_TYPES, INTERACTION_OUTCOMES, FOLLOWUP_REMINDERS } from "../../types/domain";
import type { ContactType, Enquiry, FollowupReminder, InteractionOutcome } from "../../types/domain";
import { interactionsService } from "../../services/interactions";
import { followupsService } from "../../services/followups";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { offsetDateOnly, offsetTimeOnly } from "../../utils/date";
import { browserTimezone } from "../../lib/timezone";

interface AddInteractionModalProps {
  open: boolean;
  enquiry: Enquiry | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AddInteractionModal({ open, enquiry, onClose, onSaved }: AddInteractionModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [contactType, setContactType] = useState<ContactType>("Phone Call");
  const [comment, setComment] = useState("");
  const [outcome, setOutcome] = useState<InteractionOutcome>("Interested");
  const [nextAction, setNextAction] = useState("");
  const [needsFollowup, setNeedsFollowup] = useState(false);
  const [followupDate, setFollowupDate] = useState(offsetDateOnly(2));
  const [followupTime, setFollowupTime] = useState(offsetTimeOnly(10));
  const [followupTimezone, setFollowupTimezone] = useState(browserTimezone());
  const [reminder, setReminder] = useState<FollowupReminder>("30 minutes before");
  const [saving, setSaving] = useState(false);

  if (!enquiry) return null;

  const reset = () => {
    setContactType("Phone Call");
    setComment("");
    setOutcome("Interested");
    setNextAction("");
    setNeedsFollowup(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await interactionsService.create({
        enquiry_id: enquiry.id,
        admin_id: profile.id,
        contact_type: contactType,
        comment,
        outcome,
        next_action: nextAction || null,
      });

      if (needsFollowup) {
        await followupsService.create({
          enquiry_id: enquiry.id,
          assigned_to: profile.id,
          scheduled_date: followupDate,
          scheduled_time: followupTime,
          timezone: followupTimezone,
          contact_method: contactType,
          notes: nextAction,
          reminder,
        });
      }

      toast("Interaction added");
      reset();
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Interaction" subtitle={enquiry.company_name}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FieldWrap label="Contact type" htmlFor="i-type">
          <Select id="i-type" value={contactType} onChange={(e) => setContactType(e.target.value as ContactType)}>
            {CONTACT_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Comment" htmlFor="i-comment">
          <Textarea
            id="i-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What was discussed?"
            required
          />
        </FieldWrap>

        <FieldWrap label="Outcome" htmlFor="i-outcome">
          <Select id="i-outcome" value={outcome} onChange={(e) => setOutcome(e.target.value as InteractionOutcome)}>
            {INTERACTION_OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Next action" htmlFor="i-next">
          <Input
            id="i-next"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="e.g. Send proposal"
          />
        </FieldWrap>

        <FieldWrap label="Follow-up required?" htmlFor="i-followup">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNeedsFollowup(false)}
              className={`flex-1 rounded-md border px-3 py-2.5 text-sm transition ${!needsFollowup ? "border-lime bg-lime/10 text-lime" : "border-border text-muted"}`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setNeedsFollowup(true)}
              className={`flex-1 rounded-md border px-3 py-2.5 text-sm transition ${needsFollowup ? "border-lime bg-lime/10 text-lime" : "border-border text-muted"}`}
            >
              Yes
            </button>
          </div>
        </FieldWrap>

        {needsFollowup && (
          <div className="flex flex-col gap-4 rounded-md border border-border p-4">
            <FollowupScheduleFields
              idPrefix="i-fu"
              date={followupDate}
              onDateChange={setFollowupDate}
              time={followupTime}
              onTimeChange={setFollowupTime}
              timezone={followupTimezone}
              onTimezoneChange={setFollowupTimezone}
              assigneeTimezone={profile?.timezone}
              assigneeLabel="You (per your profile)"
            />
            <FieldWrap label="Follow-up reminder" htmlFor="i-fu-reminder">
              <Select id="i-fu-reminder" value={reminder} onChange={(e) => setReminder(e.target.value as FollowupReminder)}>
                {FOLLOWUP_REMINDERS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </FieldWrap>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save interaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
