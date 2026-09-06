import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto, patchIn, findIn } from "./demo/collection";
import { notificationsService } from "./notifications";
import { auditService } from "./auditLogs";
import type { Enquiry, EnquiryStatus, LeadSource, ServiceOption } from "../types/domain";

export interface NewEnquiryInput {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  website?: string | null;
  service: ServiceOption;
  source: LeadSource;
  message?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  notes?: string | null;
}

export interface EnquiryPatch {
  priority?: Enquiry["priority"];
  assigned_to?: string | null;
  estimated_value?: number | null;
}

export const enquiriesService = {
  async list(): Promise<Enquiry[]> {
    if (isDemoMode) {
      return [...demoStore.getState().enquiries].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    }
    const { data } = await apiClient.get<Enquiry[]>("/enquiries");
    return data;
  },

  async get(id: string): Promise<Enquiry | null> {
    if (isDemoMode) return findIn(demoStore.getState().enquiries, id);
    try {
      const { data } = await apiClient.get<Enquiry>(`/enquiries/${id}`);
      return data;
    } catch {
      return null;
    }
  },

  /** Called from the public website contact form. Always lands as a NEW enquiry. */
  async create(input: NewEnquiryInput): Promise<Enquiry> {
    if (isDemoMode) {
      const now = new Date().toISOString();
      const enquiry: Enquiry = {
        id: demoStore.nextId("enq"),
        company_name: input.company_name,
        contact_name: input.contact_name,
        phone: input.phone,
        email: input.email,
        website: input.website ?? null,
        service: input.service,
        source: input.source,
        status: "NEW",
        priority: "MEDIUM",
        assigned_to: null,
        estimated_value: null,
        address_line1: input.address_line1 ?? null,
        address_line2: input.address_line2 ?? null,
        city: input.city ?? null,
        state: input.state ?? null,
        zip: input.zip ?? null,
        country: input.country ?? null,
        notes: input.notes ?? null,
        created_at: now,
        updated_at: now,
        converted_at: null,
        lost_at: null,
      };
      demoStore.update((s) => ({ ...s, enquiries: upsertInto(s.enquiries, enquiry) }));
      await notificationsService.push({
        kind: "NEW_ENQUIRY",
        title: "New enquiry",
        body: `${enquiry.company_name} just submitted an enquiry.`,
        entity_id: enquiry.id,
      });
      return enquiry;
    }
    // Server forces status=NEW and creates the notification itself. admin-server's
    // createEnquirySchema expects camelCase keys (companyName/contactName/...) — the REST
    // *response* shape (Enquiry, used above in demo mode) is snake_case to match the DB columns,
    // but the create *request* schema is not, so this can't just forward `input` as-is.
    const { data } = await apiClient.post<Enquiry>("/enquiries", {
      companyName: input.company_name,
      contactName: input.contact_name,
      phone: input.phone,
      email: input.email,
      website: input.website ?? null,
      service: input.service,
      source: input.source,
      addressLine1: input.address_line1 ?? null,
      addressLine2: input.address_line2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      zip: input.zip ?? null,
      country: input.country ?? null,
      notes: input.notes ?? null,
    });
    return data;
  },

  async updatePatch(id: string, patch: EnquiryPatch): Promise<Enquiry> {
    if (isDemoMode) {
      const updated_at = new Date().toISOString();
      const { list, item } = patchIn(demoStore.getState().enquiries, id, { ...patch, updated_at });
      if (!item) throw new Error("Enquiry not found");
      demoStore.update((s) => ({ ...s, enquiries: list }));
      return item;
    }
    const { data } = await apiClient.patch<Enquiry>(`/enquiries/${id}`, patch);
    return data;
  },

  async updateStatus(id: string, status: EnquiryStatus, adminId: string): Promise<Enquiry> {
    if (isDemoMode) {
      const updated_at = new Date().toISOString();
      const extra: Partial<Enquiry> = { status, updated_at };
      if (status === "CONVERTED") extra.converted_at = updated_at;
      if (status === "LOST") extra.lost_at = updated_at;

      const { list, item } = patchIn(demoStore.getState().enquiries, id, extra);
      if (!item) throw new Error("Enquiry not found");
      demoStore.update((s) => ({ ...s, enquiries: list }));

      if (status === "CONVERTED") {
        await notificationsService.push({
          kind: "CONVERTED",
          title: "Lead converted",
          body: `${item.company_name} converted to a customer.`,
          entity_id: id,
        });
      }
      await auditService.log(adminId, `MOVE_TO_${status}`, "enquiry", id, `Moved ${item.company_name} to ${status}.`);
      return item;
    }
    // Server creates the audit_logs entry itself — no client-side auditService.log call here.
    const { data } = await apiClient.patch<Enquiry>(`/enquiries/${id}/status`, { status });
    return data;
  },
};
