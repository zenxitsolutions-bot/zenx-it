// Replaces lib/supabaseClient.js — the public contact form now POSTs straight to the ZenX Admin
// backend's public enquiry endpoint instead of inserting into Supabase directly.
const apiUrl = import.meta.env.VITE_ADMIN_API_URL;

export const isAdminApiConfigured = Boolean(apiUrl);

export async function submitEnquiry(payload) {
  const res = await fetch(`${apiUrl}/enquiries`, {
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
