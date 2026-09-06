import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto, patchIn } from "./demo/collection";
import type { AppNotification, NotificationKind } from "../types/domain";

export interface NewNotificationInput {
  kind: NotificationKind;
  title: string;
  body: string;
  entity_id: string | null;
}

export const notificationsService = {
  async list(): Promise<AppNotification[]> {
    if (isDemoMode) {
      return [...demoStore.getState().notifications].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    }
    const { data } = await apiClient.get<AppNotification[]>("/notifications");
    return data;
  },

  /** In live mode this is a no-op — the server creates notifications itself as a side effect of
   * the action that warrants one (e.g. a new enquiry). Demo mode has no server, so it still
   * writes directly to the local store. */
  async push(input: NewNotificationInput): Promise<void> {
    if (isDemoMode) {
      const entry: AppNotification = {
        id: demoStore.nextId("notif"),
        kind: input.kind,
        title: input.title,
        body: input.body,
        entity_id: input.entity_id,
        read: false,
        created_at: new Date().toISOString(),
      };
      demoStore.update((s) => ({ ...s, notifications: upsertInto(s.notifications, entry) }));
    }
  },

  async markRead(id: string): Promise<void> {
    if (isDemoMode) {
      demoStore.update((s) => {
        const { list } = patchIn(s.notifications, id, { read: true });
        return { ...s, notifications: list };
      });
      return;
    }
    await apiClient.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    if (isDemoMode) {
      demoStore.update((s) => ({
        ...s,
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      }));
      return;
    }
    await apiClient.patch("/notifications/read-all");
  },
};
