import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "StreamBridge",
        short_name: "StreamBridge",
        description: "Combined live streaming chat for multiple platforms",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#080d1c",
        theme_color: "#6c4cff",

        icons: [
          {
            src: "/pwa-64x64.png",
            sizes: "64x64",
            type: "image/png"
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],

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