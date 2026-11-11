import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
// Always explicit: regular npm run ait:build never sets these flags.
const env = {
  ...process.env,
  VITE_APP_RUNTIME: "toss",
  VITE_TEST_DEMO: "true",
  AIMI_TEST_BUILD: "true",
  VITE_API_BASE_URL: "https://aimi-online-api.onrender.com",
};
for (const args of [
  ["run", "build:shared"],
  ["run", "ait:build", "--workspace", "@aimi/miniapp"],
]) {
  const r = spawnSync("npm", args, { stdio: "inherit", env });
  if (r.status !== 0) process.exit(r.status || 1);
}
mkdirSync("output/releases/toss-ui-test", { recursive: true });
copyFileSync(
  "apps/miniapp/aimi.ait",
  "output/releases/toss-ui-test/AIMI_UI_TEST_ONLY.ait",
);
console.log(
  "Test-only bundle: output/releases/toss-ui-test/AIMI_UI_TEST_ONLY.ait",
);
