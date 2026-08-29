import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { patchIn, findIn } from "./demo/collection";
import { auditService } from "./auditLogs";
import type { Company, ApplicationAccess, ZenxUser } from "../types/domain";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export class LogoValidationError extends Error {}

export const companiesService = {
  async list(): Promise<Company[]> {
    if (isDemoMode) {
      return [...demoStore.getState().companies].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
      );
    }
    const { data } = await apiClient.get<Company[]>("/companies");
    return data;
  },

  async get(id: string): Promise<Company | null> {
    if (isDemoMode) return findIn(demoStore.getState().companies, id);
    try {
      const { data } = await apiClient.get<Company>(`/companies/${id}`);
      return data;
    } catch {
      return null;
    }
  },

  async listApplicationAccess(companyId: string): Promise<ApplicationAccess[]> {
    if (isDemoMode) {
      return demoStore.getState().applicationAccess.filter((a) => a.company_id === companyId);
    }
    const { data } = await apiClient.get<ApplicationAccess[]>(`/companies/${companyId}/application-access`);
    return data;
  },

  async listUsersForCompany(companyId: string) {
    const grants = await this.listApplicationAccess(companyId);
    if (grants.length === 0) return [];
    if (isDemoMode) {
      const users = demoStore.getState().zenxUsers;
      return grants.map((g) => ({ grant: g, user: findIn(users, g.user_id) }));
    }
    const { data: users } = await apiClient.get<ZenxUser[]>(`/companies/${companyId}/users`);
    return grants.map((g) => ({ grant: g, user: users.find((u) => u.id === g.user_id) ?? null }));
  },

  async setStatus(id: string, status: Company["status"], adminId: string): Promise<Company> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().companies, id, { status });
      if (!item) throw new Error("Company not found");
      demoStore.update((s) => ({ ...s, companies: list }));
      await auditService.log(
        adminId,
        status === "INACTIVE" ? "DEACTIVATE_COMPANY" : "ACTIVATE_COMPANY",
        "company",
        id,
        `${status === "INACTIVE" ? "Deactivated" : "Activated"} ${item.company_name}.`
      );
      return item;
    }
    // Server creates the audit_logs entry itself.
    const { data } = await apiClient.patch<Company>(`/companies/${id}/status`, { status });
    return data;
  },

  async setApplicationAccess(accessId: string, status: ApplicationAccess["status"], adminId: string): Promise<ApplicationAccess> {
    if (isDemoMode) {
      const patch: Partial<ApplicationAccess> = {
        status,
        activated_at: status === "ACTIVE" ? new Date().toISOString() : undefined,
        deactivated_at: status === "DISABLED" ? new Date().toISOString() : null,
      };
      const { list, item } = patchIn(demoStore.getState().applicationAccess, accessId, patch);
      if (!item) throw new Error("Application access record not found");
      demoStore.update((s) => ({ ...s, applicationAccess: list }));
      await auditService.log(
        adminId,
        status === "ACTIVE" ? "GRANT_APPLICATION_ACCESS" : "REVOKE_APPLICATION_ACCESS",
        "application_access",
        accessId,
        `Set application access to ${status}.`
      );
      return item;
    }
    const { data } = await apiClient.patch<ApplicationAccess>(`/companies/application-access/${accessId}`, { status });
    return data;
  },

  /**
   * Sets a person's password directly (creation, or an admin-triggered reset) — no
   * email round-trip. Flags must_change_password so they're forced to pick their
   * own on next login.
   */
  async setCustomerPassword(userId: string, password: string): Promise<void> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().zenxUsers, userId, { must_change_password: true });
      if (!item) throw new Error("User not found");
      demoStore.update((s) => ({
        ...s,
        zenxUsers: list,
        customerPasswords: { ...s.customerPasswords, [userId]: password },
      }));
      return;
    }
    await apiClient.patch(`/companies/customers/${userId}/password`, { password });
  },

  /** Validates the file client-side, uploads it, and updates companies.logo_url. */
  async uploadLogo(companyId: string, file: File): Promise<string> {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      throw new LogoValidationError("Logo must be a PNG, JPEG, or WEBP image.");
    }
    if (file.size > MAX_LOGO_BYTES) {
      throw new LogoValidationError("Logo must be 2MB or smaller.");
    }

    if (isDemoMode) {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { list, item } = patchIn(demoStore.getState().companies, companyId, { logo_url: dataUrl });
      if (!item) throw new Error("Company not found");
      demoStore.update((s) => ({ ...s, companies: list }));
      return dataUrl;
    }

    const formData = new FormData();
    formData.append("logo", file);
    const { data } = await apiClient.post<Company>(`/companies/${companyId}/logo`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return `${apiClient.defaults.baseURL?.replace(/\/api$/, "")}${data.logo_url}`;
  },

  async removeLogo(companyId: string): Promise<void> {
    if (isDemoMode) {
      const { list } = patchIn(demoStore.getState().companies, companyId, { logo_url: null });
      demoStore.update((s) => ({ ...s, companies: list }));
      return;
    }
    await apiClient.delete(`/companies/${companyId}/logo`);
  },
};
