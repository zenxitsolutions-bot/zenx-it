import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto } from "./demo/collection";
import type { AuditLog } from "../types/domain";

export const auditService = {
  async list(): Promise<AuditLog[]> {
    if (isDemoMode) {
      return [...demoStore.getState().auditLogs].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    }
    const { data } = await apiClient.get<AuditLog[]>("/audit-logs");
    return data;
  },

  /** Demo-mode only — every live write path that needs an audit entry now creates it server-side
   * (see admin-server's controllers), so this is a no-op once a real backend is configured. */
  async log(adminId: string, action: string, entityType: string, entityId: string, description: string): Promise<void> {
    if (isDemoMode) {
      const entry: AuditLog = {
        id: demoStore.nextId("log"),
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        description,
        created_at: new Date().toISOString(),
      };
      demoStore.update((s) => ({ ...s, auditLogs: upsertInto(s.auditLogs, entry) }));
    }
  },
};
