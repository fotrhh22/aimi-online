import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db.js";
import { parseConfig } from "../src/config.js";

test("retired personal demo keeps stored records and AI counters unchanged", async () => {
  const config = parseConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
  });
  const pool = createPool(config.DATABASE_URL),
    app = createApp(config, pool);
  try {
    await app.ready();
    const snapshot = async () =>
      (
        await pool.query(
          "SELECT id,epoch,ai_calls,starts_at,ends_at,state FROM aimi.test_demo_stores ORDER BY id",
        )
      ).rows;
    const before = await snapshot();
    for (const path of [
      "/web-demo/session",
      "/web-demo/reset",
      "/web-demo/v1/optimizer/jobs",
      "/web-demo/v1/recommendations",
    ]) {
      const r = await app.inject({
        method: "POST",
        url: path,
        payload: { create: true },
      });
      assert.equal(r.statusCode, 410);
      assert.equal(r.json().error.code, "WEB_DEMO_CLOSED");
    }
    assert.deepEqual(await snapshot(), before);
  } finally {
    await app.close();
    await pool.end();
  }
});
