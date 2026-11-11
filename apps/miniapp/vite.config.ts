import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
if (
  process.env.VITE_TEST_DEMO === "true" &&
  process.env.AIMI_TEST_BUILD !== "true"
)
  throw Error("DEMO_REQUIRES_EXPLICIT_TEST_BUILD");
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:" + (process.env.AIMI_DEV_API_PORT || "8081"),
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: { outDir: "dist" },
});
