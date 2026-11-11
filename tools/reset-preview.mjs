// Only resets the dedicated 5280 preview's local API. Does not touch DB/Render/8081.
import { spawnSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const root = resolve(fileURLToPath(new URL("../", import.meta.url)));
const port = "8181";
if (process.env.RENDER || process.env.NODE_ENV === "production")
  throw Error("LOCAL_PREVIEW_ONLY");
const listening = () =>
  spawnSync("lsof", ["-t", "-nP", "-iTCP:" + port, "-sTCP:LISTEN"], {
    encoding: "utf8",
  })
    .stdout?.trim()
    .split(/\s+/)
    .filter(Boolean) ?? [];
for (const value of [...new Set(listening())]) {
  const pid = Number(value);
  const command =
    spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" })
      .stdout ?? "";
  const cwd = spawnSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
    encoding: "utf8",
  })
    .stdout?.split("\n")
    .find((line) => line.startsWith("n"))
    ?.slice(1);
  if (
    !command.includes("apps/api/src/prototype-server.ts") ||
    !cwd ||
    resolve(cwd) !== root
  )
    throw Error(
      "8181 포트가 다른 프로그램에서 사용 중이에요. 해당 프로그램을 확인해주세요.",
    );
  process.kill(pid, "SIGTERM");
}
for (let i = 0; i < 30 && listening().length; i++)
  await new Promise((r) => setTimeout(r, 100));
if (listening().length)
  throw Error(
    "기존 미리보기 API가 아직 종료 중이에요. 잠시 후 다시 실행해주세요.",
  );
console.log(
  "로컬 EP·게임·챌린지 상태를 초기화해요. 5280 미리보기를 새로고침한 뒤 개발 로그인해주세요.",
);
const child = spawn(
  process.execPath,
  ["--import", "tsx", "apps/api/src/prototype-server.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PROTOTYPE_PORT: port,
      AIMI_DEV_PERSIST_STATE: "false",
    },
  },
);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopping = true;
    child.kill(signal);
  });
child.on("exit", (code) => {
  process.exitCode = stopping ? 0 : (code ?? 1);
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
