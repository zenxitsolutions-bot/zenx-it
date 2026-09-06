import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto, patchIn } from "./demo/collection";
import type { ContactType, Followup, FollowupReminder } from "../types/domain";
import { browserTimezone, zonedTimeToUtcIso } from "../lib/timezone";

export interface NewFollowupInput {
  enquiry_id: string;
  assigned_to: string | null;
  scheduled_date: string;
  scheduled_time: string;
  // Required on create — see admin-server/src/schemas/followup.schema.js's comment on why this is
  // never silently defaulted for a NEW row (unlike the migration backfill's flagged placeholder for
  // historical ones). FollowupScheduleFields.tsx always supplies the browser's own zone by default.
  timezone: string;
  contact_method: ContactType;
  notes?: string | null;
  reminder: FollowupReminder;
}

export const followupsService = {
  async list(): Promise<Followup[]> {
    if (isDemoMode) {
      // Demo fixtures predate scheduled_at_utc — fall back to combining the wall-clock fields
      // exactly like the pre-rollout sort did, so demo mode's ordering is unaffected.
      return [...demoStore.getState().followups].sort(
        (a, b) =>
          +new Date(a.scheduled_at_utc ?? `${a.scheduled_date}T${a.scheduled_time}`) -
          +new Date(b.scheduled_at_utc ?? `${b.scheduled_date}T${b.scheduled_time}`)
      );
    }
    const { data } = await apiClient.get<Followup[]>("/followups");
    return data;
  },

  async listForEnquiry(enquiryId: string): Promise<Followup[]> {
    const all = await this.list();
    return all.filter((f) => f.enquiry_id === enquiryId);
  },

  async create(input: NewFollowupInput): Promise<Followup> {
    if (isDemoMode) {
      const entry: Followup = {
        id: demoStore.nextId("fu"),
        enquiry_id: input.enquiry_id,
        assigned_to: input.assigned_to,
        scheduled_date: input.scheduled_date,
        scheduled_time: input.scheduled_time,
        scheduled_at_utc: zonedTimeToUtcIso(`${input.scheduled_date}T${input.scheduled_time}`, input.timezone),
        timezone: input.timezone,
        contact_method: input.contact_method,
        notes: input.notes ?? null,
        reminder: input.reminder,
        status: "SCHEDULED",
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      demoStore.update((s) => ({ ...s, followups: upsertInto(s.followups, entry) }));
      return entry;
    }
    const { enquiry_id, assigned_to, scheduled_date, scheduled_time, timezone, contact_method, notes, reminder } = input;
    const { data } = await apiClient.post<Followup>("/followups", {
      enquiryId: enquiry_id,
      assignedTo: assigned_to,
      scheduledDate: scheduled_date,
      scheduledTime: scheduled_time,
      timezone,
      contactMethod: contact_method,
      notes,
      reminder,
    });
    return data;
  },

  async complete(id: string): Promise<Followup> {
    return this.patch(id, { status: "COMPLETED", completed_at: new Date().toISOString() });
  },

  async reschedule(id: string, date: string, time: string, timezone: string = browserTimezone()): Promise<Followup> {
    return this.patch(id, { scheduled_date: date, scheduled_time: time, timezone, status: "RESCHEDULED" });
  },

  async cancel(id: string): Promise<Followup> {
    return this.patch(id, { status: "CANCELLED" });
  },

  async patch(id: string, patch: Partial<Followup>): Promise<Followup> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().followups, id, patch);
      if (!item) throw new Error("Follow-up not found");
      demoStore.update((s) => ({ ...s, followups: list }));
      return item;
    }
    const { scheduled_date, scheduled_time, timezone, contact_method, notes, reminder, status, completed_at } = patch;
    const { data } = await apiClient.patch<Followup>(`/followups/${id}`, {
      scheduledDate: scheduled_date,
      scheduledTime: scheduled_time,
      timezone,
      contactMethod: contact_method,
      notes,
      reminder,
      status,
      completedAt: completed_at,
    });
    return data;
  },
};
