import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * The dev server proxies `/api` to the Express server rather than enabling
 * CORS. One origin in development means the cookie and CSRF story does not
 * change shape when real auth lands (T4.1–T4.3).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@gradtracker/shared": fileURLToPath(new URL("../shared/src/index.ts", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env["SERVER_ORIGIN"] ?? "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
