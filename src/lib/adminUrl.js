// Points the public site's "Admin Login" link at the admin portal.
// Set VITE_ADMIN_URL in .env.local once the admin portal has a real deployed
// URL (e.g. https://admin.zenxitsolutions.com/admin/login). Defaults to the
// local admin dev server so the link works out of the box while developing.
export const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || "http://localhost:5174/admin/login";
