import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// While you work, any address starting with /api is passed on to the server (port 3001).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
