import { apiClient, isDemoMode } from "../lib/apiClient";
import { setCustomerAccessToken } from "../lib/tokenStore";
import { demoStore } from "./demo/demoStore";
import { findIn, patchIn } from "./demo/collection";
import type { Application, Company, ZenxUser, ApplicationAccess } from "../types/domain";

export const CUSTOMER_DEMO_PASSWORD = "ZenXCustomerDemo123!";
const CUSTOMER_DEMO_SESSION_KEY = "zenx_customer_demo_session";

export class CustomerAuthError extends Error {}

export interface ActiveGrant {
  application: Application;
  company: Company;
  grant: ApplicationAccess;
}

function errorMessage(err: unknown, fallback: string): string {
  const maybeAxios = err as { response?: { data?: { error?: string } } };
  return maybeAxios?.response?.data?.error ?? fallback;
}

export const customerAuthService = {
  async signIn(email: string, password: string): Promise<ZenxUser> {
    if (isDemoMode) {
      const user = demoStore
        .getState()
        .zenxUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) throw new CustomerAuthError("No account found with that email.");
      if (user.status === "DISABLED") {
        throw new CustomerAuthError("This account has been disabled.");
      }
      if (demoStore.getState().customerPasswords[user.id] !== password) {
        throw new CustomerAuthError("Incorrect password.");
      }
      localStorage.setItem(CUSTOMER_DEMO_SESSION_KEY, user.id);
      return user;
    }

    try {
      const { data } = await apiClient.post<{ user: ZenxUser; accessToken: string }>("/customer-auth/login", { email, password });
      setCustomerAccessToken(data.accessToken);
      return data.user;
    } catch (err) {
      throw new CustomerAuthError(errorMessage(err, "Login failed."));
    }
  },

  /** Called from the forced "change your password" screen — clears must_change_password. */
  async setNewPassword(userId: string, newPassword: string): Promise<void> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().zenxUsers, userId, { must_change_password: false });
      if (!item) throw new CustomerAuthError("Account not found.");
      demoStore.update((s) => ({
        ...s,
        zenxUsers: list,
        customerPasswords: { ...s.customerPasswords, [userId]: newPassword },
      }));
      return;
    }
    try {
      await apiClient.post("/customer-auth/set-password", { password: newPassword });
    } catch (err) {
      throw new CustomerAuthError(errorMessage(err, "Could not set new password."));
    }
  },

  async signOut(): Promise<void> {
    if (isDemoMode) {
      localStorage.removeItem(CUSTOMER_DEMO_SESSION_KEY);
      return;
    }
    await apiClient.post("/customer-auth/logout").catch(() => {});
    setCustomerAccessToken(null);
  },

  async getCurrentUser(): Promise<ZenxUser | null> {
    if (isDemoMode) {
      const id = localStorage.getItem(CUSTOMER_DEMO_SESSION_KEY);
      if (!id) return null;
      return findIn(demoStore.getState().zenxUsers, id);
    }
    try {
      const { data: refreshData } = await apiClient.post<{ accessToken: string }>("/customer-auth/refresh");
      setCustomerAccessToken(refreshData.accessToken);
      const { data } = await apiClient.get<{ user: ZenxUser }>("/customer-auth/me");
      return data.user;
    } catch {
      return null;
    }
  },

  async getActiveGrants(userId: string): Promise<ActiveGrant[]> {
    if (isDemoMode) {
      const state = demoStore.getState();
      return state.applicationAccess
        .filter((g) => g.user_id === userId && g.status === "ACTIVE")
        .map((grant) => ({
          grant,
          application: state.applications.find((a) => a.slug === grant.application),
          company: state.companies.find((c) => c.id === grant.company_id),
        }))
        .filter((g): g is ActiveGrant => !!g.application && !!g.company);
    }
    const { data } = await apiClient.get<{ grant: ApplicationAccess; application: Application | null; company: Company | null }[]>(
      "/customer-auth/grants"
    );
    return data.filter((g): g is ActiveGrant => !!g.application && !!g.company);
  },

  /** Resolves a deep link into a target application via a signed handoff token. */
  async openApplication(applicationSlug: string, companyId: string): Promise<string> {
    if (isDemoMode) {
      const state = demoStore.getState();
      const app = state.applications.find((a) => a.slug === applicationSlug);
      const company = state.companies.find((c) => c.id === companyId);
      if (!app?.url || !company) {
        throw new CustomerAuthError("This application has not been deployed yet.");
      }
      return `${app.url.replace(/\/$/, "")}/${company.company_slug}`;
    }

    try {
      const { data } = await apiClient.post<{ url: string }>("/customer-auth/handoff-token", { applicationSlug, companyId });
      return data.url;
    } catch (err) {
      throw new CustomerAuthError(errorMessage(err, "This application is not available right now."));
    }
  },
};
