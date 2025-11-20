import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://152.67.29.80:9090",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
