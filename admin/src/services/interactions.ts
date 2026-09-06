import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto } from "./demo/collection";
import type { ContactType, Interaction, InteractionOutcome } from "../types/domain";

export interface NewInteractionInput {
  enquiry_id: string;
  admin_id: string;
  contact_type: ContactType;
  comment: string;
  outcome: InteractionOutcome;
  next_action?: string | null;
}

export const interactionsService = {
  async list(): Promise<Interaction[]> {
    if (isDemoMode) {
      return [...demoStore.getState().interactions].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    }
    const { data } = await apiClient.get<Interaction[]>("/interactions");
    return data;
  },

  async listForEnquiry(enquiryId: string): Promise<Interaction[]> {
    if (isDemoMode) {
      return demoStore
        .getState()
        .interactions.filter((i) => i.enquiry_id === enquiryId)
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    }
    const { data } = await apiClient.get<Interaction[]>("/interactions", { params: { enquiryId } });
    return data;
  },

  async create(input: NewInteractionInput): Promise<Interaction> {
    if (isDemoMode) {
      const entry: Interaction = {
        id: demoStore.nextId("int"),
        enquiry_id: input.enquiry_id,
        admin_id: input.admin_id,
        contact_type: input.contact_type,
        comment: input.comment,
        outcome: input.outcome,
        next_action: input.next_action ?? null,
        created_at: new Date().toISOString(),
      };
      demoStore.update((s) => ({ ...s, interactions: upsertInto(s.interactions, entry) }));
      return entry;
    }
    // admin_id is set server-side from the authenticated session, not trusted from the body.
    const { enquiry_id, contact_type, comment, outcome, next_action } = input;
    const { data } = await apiClient.post<Interaction>("/interactions", {
      enquiryId: enquiry_id,
      contactType: contact_type,
      comment,
      outcome,
      nextAction: next_action,
    });
    return data;
  },
};
