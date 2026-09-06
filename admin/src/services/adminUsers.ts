import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { upsertInto, patchIn } from "./demo/collection";
import { auditService } from "./auditLogs";
import type { AdminRole, Profile } from "../types/domain";

export interface NewAdminUserInput {
  first_name: string;
  last_name: string;
  email: string;
  role: AdminRole;
}

export const adminUsersService = {
  async list(): Promise<Profile[]> {
    if (isDemoMode) {
      return [...demoStore.getState().profiles].sort((a, b) => a.first_name.localeCompare(b.first_name));
    }
    const { data } = await apiClient.get<Profile[]>("/admin-users");
    return data;
  },

  async invite(input: NewAdminUserInput, actingAdminId: string): Promise<Profile> {
    if (isDemoMode) {
      const profile: Profile = {
        id: demoStore.nextId("adm"),
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        role: input.role,
        status: "ACTIVE",
        created_at: new Date().toISOString(),
      };
      demoStore.update((s) => ({ ...s, profiles: upsertInto(s.profiles, profile) }));
      await auditService.log(actingAdminId, "INVITE_ADMIN", "profile", profile.id, `Invited ${profile.email} as ${profile.role}.`);
      return profile;
    }
    const { data } = await apiClient.post<Profile>("/admin-users/invite", {
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email,
      role: input.role,
    });
    return data;
  },

  async setStatus(id: string, status: Profile["status"], actingAdminId: string): Promise<Profile> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().profiles, id, { status });
      if (!item) throw new Error("Admin user not found");
      demoStore.update((s) => ({ ...s, profiles: list }));
      await auditService.log(actingAdminId, status === "DISABLED" ? "DISABLE_ADMIN" : "ENABLE_ADMIN", "profile", id, `${status === "DISABLED" ? "Disabled" : "Enabled"} ${item.email}.`);
      return item;
    }
    const { data } = await apiClient.patch<Profile>(`/admin-users/${id}`, { status });
    return data;
  },

  async setRole(id: string, role: AdminRole, actingAdminId: string): Promise<Profile> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().profiles, id, { role });
      if (!item) throw new Error("Admin user not found");
      demoStore.update((s) => ({ ...s, profiles: list }));
      await auditService.log(actingAdminId, "CHANGE_ROLE", "profile", id, `Changed role to ${role} for ${item.email}.`);
      return item;
    }
    const { data } = await apiClient.patch<Profile>(`/admin-users/${id}`, { role });
    return data;
  },
};
