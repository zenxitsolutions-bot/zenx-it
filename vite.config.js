import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Pinned, distinct from wellness-app's client (5173) and admin's (5174, see admin/vite.config.ts)
  // — an unpinned default here is what silently pushed admin off its own port in the first place
  // (see adminUrl.js's ADMIN_URL comment).
  server: { port: 5175, strictPort: true },
});
