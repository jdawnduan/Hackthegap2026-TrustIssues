import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // VITE_BASE lets the static build live under a sub-path (GitHub Pages serves
  // the repo at /<repo-name>/). Unset, it builds for the site root as before.
  base: process.env.VITE_BASE ?? "/",
  server: {
    port: 5173,
    // host: true binds to all interfaces, so a phone on the same Wi-Fi can open
    // http://<your-computer's-ip>:5173 and the /api proxy still works.
    host: true,
    proxy: { "/api": "http://localhost:8787" },
  },
});
