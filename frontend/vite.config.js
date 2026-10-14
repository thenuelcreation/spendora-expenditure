import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiOrigin = (process.env.SPENDORA_API_URL || "http://localhost:4000")
  .replace(/\/+$/, "");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: apiOrigin,
        changeOrigin: true,
        configure(proxy) {
          proxy.on("error", (error, _request, response) => {
            console.error(`[spendora-api-proxy] ${error.message}`);
            if (!response.headersSent) {
              response.writeHead(503, { "Content-Type": "application/json" });
              response.end(JSON.stringify({
                error: "Spendora API is offline. Start the backend from the project folder with `npm run dev`.",
              }));
            }
          });
        },
      },
    },
  },
  preview: {
    host: "0.0.0.0",
  },
});
