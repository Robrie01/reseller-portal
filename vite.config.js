// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/reseller-portal/",              // serve under this base path
  server: {
    port: 5174,                           // <— always use 5174
    strictPort: true,                     // fail if 5174 is busy (don’t auto-swap to 5173)
    open: "/reseller-portal/",            // open this path in the browser
  },
  preview: {
    port: 5174,
    strictPort: true,
    open: "/reseller-portal/",
  },
});
