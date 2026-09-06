import { apiClient, isDemoMode } from "../lib/apiClient";
import { demoStore } from "./demo/demoStore";
import { patchIn } from "./demo/collection";
import type { Application } from "../types/domain";

export const applicationsService = {
  async list(): Promise<Application[]> {
    if (isDemoMode) return [...demoStore.getState().applications];
    const { data } = await apiClient.get<Application[]>("/applications");
    return data;
  },

  async updateUrl(id: string, url: string): Promise<Application> {
    if (isDemoMode) {
      const { list, item } = patchIn(demoStore.getState().applications, id, { url });
      if (!item) throw new Error("Application not found");
      demoStore.update((s) => ({ ...s, applications: list }));
      return item;
    }
    const { data } = await apiClient.patch<Application>(`/applications/${id}`, { url });
    return data;
  },
};
