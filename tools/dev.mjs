import { spawn } from "node:child_process";
const children = [],
  env = { ...process.env, VITE_API_BASE_URL: "/api" };
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const args of [
  ["run", "dev:prototype", "--workspace", "@aimi/api"],
  ["run", "dev", "--workspace", "@aimi/miniapp"],
]) {
  const child = spawn("npm", args, { stdio: "inherit", env });
  children.push(child);
  child.on("exit", (code) => stop(code ?? 0));
  child.on("error", () => stop(1));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
