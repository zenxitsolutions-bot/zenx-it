import { FieldWrap, Input } from "../ui/Field";
import { TimezoneSelect } from "./TimezoneSelect";
import { timezoneOffsetLabel, formatInZone, zonedTimeToUtcIso, isKnownTimezone } from "../../lib/timezone";

interface FollowupScheduleFieldsProps {
  idPrefix: string;
  date: string;
  onDateChange: (value: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  timezone: string;
  onTimezoneChange: (value: string) => void;
  // Optional — when the caller knows who this follow-up is assigned to and that person's saved
  // timezone, showing "{Label} will see: {time}" makes a cross-timezone scheduling mistake obvious
  // before saving (spec item 6/18), same pattern as wellness-app's SlotPicker.jsx.
  assigneeTimezone?: string;
  assigneeLabel?: string;
}

// The one shared date+time+timezone capture UI for scheduling a follow-up — de-duplicates
// ScheduleFollowupModal.tsx's own fields and AddInteractionModal.tsx's independently-duplicated
// copy of the exact same markup (both used plain native <input type=date/time>, no timezone field
// at all, before this rollout).
export function FollowupScheduleFields({
  idPrefix,
  date,
  onDateChange,
  time,
  onTimeChange,
  timezone,
  onTimezoneChange,
  assigneeTimezone,
  assigneeLabel,
}: FollowupScheduleFieldsProps) {
  // The real UTC instant this date+time+timezone represents, computed the same DST-safe way the
  // server does (timezoneService.js#wallClockToUtc) — never a manual offset calculation.
  const utcInstant = date && time && isKnownTimezone(timezone) ? zonedTimeToUtcIso(`${date}T${time}`, timezone) : null;
  const showPreview = utcInstant && assigneeTimezone && assigneeTimezone !== timezone;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <FieldWrap label="Follow-up date" htmlFor={`${idPrefix}-date`}>
          <Input id={`${idPrefix}-date`} type="date" value={date} onChange={(e) => onDateChange(e.target.value)} required />
        </FieldWrap>
        <FieldWrap label="Follow-up time" htmlFor={`${idPrefix}-time`}>
          <Input id={`${idPrefix}-time`} type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} required />
        </FieldWrap>
      </div>

      <FieldWrap
        label="Timezone"
        htmlFor={`${idPrefix}-timezone`}
        hint={`Times above are in ${timezone} (${timezoneOffsetLabel(timezone)})`}
      >
        <TimezoneSelect id={`${idPrefix}-timezone`} value={timezone} onChange={onTimezoneChange} />
      </FieldWrap>

      {showPreview && (
        <p className="rounded-md border border-lime/30 bg-lime/5 px-3 py-2 text-xs text-offwhite">
          {assigneeLabel ?? "The assignee"} will see: <strong className="text-lime">{formatInZone(utcInstant, assigneeTimezone)}</strong> ({assigneeTimezone})
        </p>
      )}
    </div>
  );
}
