import { parseConfig } from "./config.js";
import { createPool } from "./db.js";
import { loadRemoteContent } from "./services/content/remote.js";
import { refreshScheduledContent } from "./services/content/scheduled.js";
import { createApp } from "./app.js";
import { performance } from "node:perf_hooks";
import { recordBootContentLoad } from "./observability/startup.js";
const config = parseConfig(process.env);
const pool = createPool(config.DATABASE_URL);
const contentLoadStarted = performance.now();
await loadRemoteContent(pool);
recordBootContentLoad(performance.now() - contentLoadStarted);
const app = createApp(config, pool);
if (process.env.AIMI_CONTENT_SCHEDULED === "true") {
  await refreshScheduledContent(pool);
  const timer = setInterval(() => {
    void refreshScheduledContent(pool).catch(() => app.log.error("SCHEDULED_CONTENT_REFRESH_FAILED"));
  }, 60_000);
  timer.unref();
  app.addHook("onClose", async () => clearInterval(timer));
}
app.addHook("onClose", async () => {
  await pool.end();
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close();
  });
try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch {
  app.log.error("API startup failed (connection details suppressed)");
  await app.close();
  process.exitCode = 1;
}
