import { apiClient } from "./apiClient";

/** Origin of admin-server, without the `/api` suffix — where `/uploads` is served. */
export function apiOrigin(): string {
  return (apiClient.defaults.baseURL ?? "http://localhost:4001/api").replace(/\/api\/?$/, "");
}

/**
 * Company logos are stored as a path on admin-server (`/uploads/company-logos/...`).
 * The admin portal is a different origin, so a bare path 404s against Vite. Prefix those
 * paths with the API origin. Absolute, data, and blob URLs are left alone.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${apiOrigin()}${path}`;
}
