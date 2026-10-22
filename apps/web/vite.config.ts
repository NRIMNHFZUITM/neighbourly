import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// The API server (apps/api) runs on :8787. In development every /api call goes through
// this proxy, so the browser only ever talks to one origin and no keys reach the client.
const apiProxy = {
  "/api": { target: "http://127.0.0.1:8787", changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5173, proxy: apiProxy },
  preview: { port: 4173, proxy: apiProxy },
  build: { chunkSizeWarningLimit: 1500 },
});
