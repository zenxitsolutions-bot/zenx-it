import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
    },
  },
  // Pinned (not Vite's default-and-drift-on-conflict behavior): admin-server's
  // ZENX_DIETITIAN_URL and this app's own CLIENT_ORIGIN both hardcode 5173 — a silent port bump
  // here would break the SSO handoff and CORS without any error, only a confusing 401/403 later.
  server: { port: 5173, strictPort: true },
})
