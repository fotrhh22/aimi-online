import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { lockedViewport } from "./src/lib/scale-policy";
if (
  process.env.VITE_TEST_DEMO === "true" &&
  process.env.AIMI_TEST_BUILD !== "true"
)
  throw Error("DEMO_REQUIRES_EXPLICIT_TEST_BUILD");
if (
  process.env.VITE_APP_RUNTIME === "web-demo" &&
  (process.env.AIMI_TEST_BUILD !== "true" ||
    process.env.VITE_TEST_DEMO !== "true")
)
  throw Error("WEB_DEMO_REQUIRES_EXPLICIT_TEST_BUILD");
export default defineConfig({
  plugins: [
    react(),
    {
      name: "aimi-toss-viewport",
      apply: "build",
      transformIndexHtml(html) {
        if (process.env.VITE_APP_RUNTIME === "web-demo") return html;
        return html.replace(
          /(name="viewport"\s+content=")[^"]*(")/,
          "$1" + lockedViewport + "$2",
        );
      },
    },
  ],
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
