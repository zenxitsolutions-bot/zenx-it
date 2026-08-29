import { generateSeed, type DemoState } from "./demoData";
import { generateId } from "../../utils/id";
import { nowIso } from "../../utils/date";

// Bump this suffix whenever DemoState's shape changes — old localStorage payloads from a prior
// shape (e.g. the pre-companies/users/application_access "customers" model) must never be reused,
// since the app has no migration logic for cached demo data and will crash on missing keys.
const STORAGE_KEY = "zenx_admin_demo_v4";

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (
        Array.isArray(parsed.companies) &&
        Array.isArray(parsed.zenxUsers) &&
        Array.isArray(parsed.applicationAccess) &&
        parsed.customerPasswords &&
        typeof parsed.customerPasswords === "object"
      ) {
        return parsed;
      }
    }
  } catch {
    // fall through to a fresh seed
  }
  const seed = generateSeed();
  persist(seed);
  return seed;
}

function persist(state: DemoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing, quota) — demo continues in-memory only
  }
}

let state: DemoState = load();
const listeners = new Set<() => void>();

function emit() {
  persist(state);
  listeners.forEach((l) => l());
}

export const demoStore = {
  getState(): DemoState {
    return state;
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Apply an immutable update to the store and notify subscribers. */
  update(updater: (draft: DemoState) => DemoState): void {
    state = updater(state);
    emit();
  },
  resetToSeed(): void {
    state = generateSeed();
    emit();
  },
  nextId(prefix: string): string {
    return generateId(prefix);
  },
  now(): string {
    return nowIso();
  },
};

export type { DemoState };
