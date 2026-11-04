import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      "streaming-chat-app-tu3j.onrender.com",
      "streaming-chat-app-production-dc88.up.railway.app"
    ],
    proxy: {
      "/ws": {
        target: "ws://localhost:3000",
        ws: true
      }
    }
  }
});