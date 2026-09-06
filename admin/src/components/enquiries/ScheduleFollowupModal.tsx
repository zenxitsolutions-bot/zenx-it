import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { FieldWrap, Select, Textarea } from "../ui/Field";
import { Button } from "../ui/Button";
import { FollowupScheduleFields } from "../shared/FollowupScheduleFields";
import { CONTACT_TYPES, FOLLOWUP_REMINDERS } from "../../types/domain";
import type { ContactType, Enquiry, FollowupReminder, Profile } from "../../types/domain";
import { followupsService } from "../../services/followups";
import { offsetDateOnly, offsetTimeOnly } from "../../utils/date";
import { browserTimezone } from "../../lib/timezone";

interface ScheduleFollowupModalProps {
  open: boolean;
  enquiry: Enquiry | null;
  admins: Profile[];
  currentAdminId: string;
  onClose: () => void;
  onScheduled: () => void;
}

export function ScheduleFollowupModal({
  open,
  enquiry,
  admins,
  currentAdminId,
  onClose,
  onScheduled,
}: ScheduleFollowupModalProps) {
  const [date, setDate] = useState(offsetDateOnly(1));
  const [time, setTime] = useState(offsetTimeOnly(10));
  const [timezone, setTimezone] = useState(browserTimezone());
  const [method, setMethod] = useState<ContactType>("Phone Call");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState(currentAdminId);
  const [reminder, setReminder] = useState<FollowupReminder>("1 hour before");
  const [saving, setSaving] = useState(false);

  if (!enquiry) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await followupsService.create({
        enquiry_id: enquiry.id,
        assigned_to: assignedTo,
        scheduled_date: date,
        scheduled_time: time,
        timezone,
        contact_method: method,
        notes,
        reminder,
      });
      onScheduled();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Follow-up" subtitle={enquiry.company_name}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FollowupScheduleFields
          idPrefix="fu"
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          timezone={timezone}
          onTimezoneChange={setTimezone}
          assigneeTimezone={admins.find((a) => a.id === assignedTo)?.timezone}
          assigneeLabel={(() => {
            const a = admins.find((x) => x.id === assignedTo);
            return a ? `${a.first_name} ${a.last_name}` : undefined;
          })()}
        />

        <FieldWrap label="Contact method" htmlFor="fu-method">
          <Select id="fu-method" value={method} onChange={(e) => setMethod(e.target.value as ContactType)}>
            {CONTACT_TYPES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Assigned admin" htmlFor="fu-admin">
          <Select id="fu-admin" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.first_name} {a.last_name}
              </option>
            ))}
          </Select>
        </FieldWrap>

        <FieldWrap label="Notes" htmlFor="fu-notes">
          <Textarea id="fu-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What should the next contact cover?" />
        </FieldWrap>

        <FieldWrap label="Reminder" htmlFor="fu-reminder">
          <Select id="fu-reminder" value={reminder} onChange={(e) => setReminder(e.target.value as FollowupReminder)}>
            {FOLLOWUP_REMINDERS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FieldWrap>

        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Scheduling…" : "Save follow-up"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
