// Replaces lib/supabaseClient.js — the public contact form now POSTs straight to the ZenX Admin
// backend's public enquiry endpoint instead of inserting into Supabase directly.
const configuredURL = import.meta.env.VITE_ADMIN_API_URL;

export const isAdminApiConfigured = Boolean(configuredURL);

// Every admin-server route is mounted under /api. Deploys that set VITE_ADMIN_API_URL to the bare
// host (https://api.example.com) would otherwise POST to /enquiries and 404. The admin portal
// already normalizes this; the marketing site must do the same, including a trailing slash.
function normalizeBaseURL(url) {
  const trimmed = String(url).replace(/\/+$/, "");
  return /\/api$/.test(trimmed) ? trimmed : `${trimmed}/api`;
}

const baseURL = configuredURL ? normalizeBaseURL(configuredURL) : "";

export async function submitEnquiry(payload) {
  if (!baseURL) {
    throw new Error("The enquiry service is not configured.");
  }
  const res = await fetch(`${baseURL}/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to submit enquiry");
  }
  return res.json();
}
