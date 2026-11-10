import { parseConfig } from "./config.js";
import { createPool } from "./db.js";
import { loadRemoteContent } from "./services/content/remote.js";
import { createApp } from "./app.js";
const config = parseConfig(process.env);
const pool = createPool(config.DATABASE_URL);
await loadRemoteContent(pool);
const app = createApp(config, pool);
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
