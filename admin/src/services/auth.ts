import { apiClient, isDemoMode } from "../lib/apiClient";
import { setStaffAccessToken } from "../lib/tokenStore";
import { demoStore } from "./demo/demoStore";
import { findIn } from "./demo/collection";
import type { Profile } from "../types/domain";

export const DEMO_PASSWORD = "ZenXDemo123!";
const DEMO_SESSION_KEY = "zenx_admin_demo_session";

export class AuthError extends Error {}

export const authService = {
  async signIn(email: string, password: string): Promise<Profile> {
    if (isDemoMode) {
      const profile = demoStore.getState().profiles.find(
        (p) => p.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (!profile) throw new AuthError("No admin account found with that email.");
      if (profile.status === "DISABLED") throw new AuthError("This account has been disabled.");
      if (password !== DEMO_PASSWORD) throw new AuthError("Incorrect password.");
      localStorage.setItem(DEMO_SESSION_KEY, profile.id);
      return profile;
    }

    try {
      const { data } = await apiClient.post<{ profile: Profile; accessToken: string }>("/auth/login", { email, password });
      setStaffAccessToken(data.accessToken);
      return data.profile;
    } catch (err) {
      throw new AuthError(errorMessage(err, "Login failed."));
    }
  },

  async signOut(): Promise<void> {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      return;
    }
    await apiClient.post("/auth/logout").catch(() => {});
    setStaffAccessToken(null);
  },

  async sendPasswordReset(email: string): Promise<void> {
    if (isDemoMode) {
      await new Promise((r) => setTimeout(r, 500));
      return;
    }
    await apiClient.post("/auth/forgot-password", { email });
  },

  /** Bootstraps a session on app load: exchange the httpOnly refresh cookie for a fresh access
   * token, then fetch the profile. No cookie (or an expired one) → null, same as a demo mode with
   * no stored session id. */
  async getCurrentProfile(): Promise<Profile | null> {
    if (isDemoMode) {
      const id = localStorage.getItem(DEMO_SESSION_KEY);
      if (!id) return null;
      return findIn(demoStore.getState().profiles, id);
    }
    try {
      const { data: refreshData } = await apiClient.post<{ accessToken: string }>("/auth/refresh");
      setStaffAccessToken(refreshData.accessToken);
      const { data } = await apiClient.get<{ profile: Profile }>("/auth/me");
      return data.profile;
    } catch {
      return null;
    }
  },

  /** Self-service preferences (timezone/country/date_format/time_format) — PATCH /auth/me,
   * snake_case keys matching Profile's own field names (see adminUser.schema.js's comment on this
   * route forwarding req.body straight through with no renaming). */
  async updateMe(patch: Partial<Pick<Profile, "timezone" | "country" | "date_format" | "time_format">>): Promise<Profile> {
    if (isDemoMode) {
      const id = localStorage.getItem(DEMO_SESSION_KEY);
      const profile = id ? findIn(demoStore.getState().profiles, id) : null;
      if (!profile) throw new AuthError("Not signed in.");
      const updated = { ...profile, ...patch };
      demoStore.update((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? updated : p)) }));
      return updated;
    }
    const { data } = await apiClient.patch<Profile>("/auth/me", patch);
    return data;
  },
};

function errorMessage(err: unknown, fallback: string): string {
  const maybeAxios = err as { response?: { data?: { error?: string } } };
  return maybeAxios?.response?.data?.error ?? fallback;
}
