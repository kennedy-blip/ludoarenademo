import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/postcss";
import path from "node:path";

// ReScript emits .mjs next to its .res sources, so the plugin only has to handle
// the (already standards-compliant) output. No TypeScript in the build at all.
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: { plugins: [tailwind()] },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
  },
  preview: { host: "0.0.0.0", port: 3000, allowedHosts: true },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
