import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    // adminUrl.js's ADMIN_URL default (the public site's "Admin Login" link) hardcodes this port —
    // fail loudly if it's ever taken instead of silently drifting to another one.
    strictPort: true,
  },
});
