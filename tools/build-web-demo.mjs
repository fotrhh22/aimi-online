import { spawnSync } from "node:child_process";
const env = {
  ...process.env,
  VITE_APP_RUNTIME: "web-demo",
  VITE_TEST_DEMO: "true",
  AIMI_TEST_BUILD: "true",
  VITE_API_BASE_URL: "/api",
};
for (const args of [
  ["run", "build:shared"],
  ["run", "build", "--workspace", "@aimi/miniapp"],
]) {
  const r = spawnSync("npm", args, { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status || 1);
}
