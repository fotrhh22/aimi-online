import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db.js";
import { parseConfig } from "../src/config.js";
import { registerDemo } from "../src/services/demo/register.js";
import { DemoRepository, demoUser } from "../src/services/demo/repository.js";
test("demo database: isolation, atomic reset, stale epochs, persistent quota and scoped HTTP auth", async () => {
  const config = parseConfig({
      ...process.env,
      NODE_ENV: "test",
      LOG_LEVEL: "silent",
    }),
    pool = createPool(config.DATABASE_URL);
  const storeId = "integration-" + randomUUID(),
    secret = config.SESSION_SIGNING_KEY;
  const app = createApp(config, pool);
  registerDemo(app, pool, secret, storeId);
  const repo = new DemoRepository(pool, storeId);
  const beforeKey = process.env.AIMI_GEMINI_API_KEY;
  process.env.AIMI_GEMINI_API_KEY = "synthetic-demo-quota-test";
  const before = await pool.query("SELECT count(*)::int AS n FROM aimi.users");
  try {
    const session = await app.inject({
      method: "POST",
      url: "/demo/session",
      payload: {},
    });
    assert.equal(session.statusCode, 200);
    const token = session.json().data.token,
      headers = {
        authorization: "Bearer " + token,
        "idempotency-key": "demo-check-0001",
      };
    assert.equal(
      (await app.inject({ url: "/v1/state", headers })).statusCode,
      401,
    );
    assert.equal((await app.inject({ url: "/demo/v1/state" })).statusCode, 401);
    const get = await app.inject({ url: "/demo/v1/state", headers });
    assert.equal(get.statusCode, 200);
    assert.equal(get.json().data.balance, 125);
    const social = await app.inject({ url: "/demo/v1/social", headers });
    assert.equal(social.json().data.people.length, 1);
    const meta = await repo.withStore((r) => ({
      epoch: r.epoch,
      ends_at: r.ends_at,
    }));
    const beforeRead = await pool.query(
      "SELECT xmin::text AS version FROM aimi.test_demo_stores WHERE id=$1",
      [storeId],
    );
    await repo.validateEpoch(meta.epoch);
    await repo.read(demoUser(meta.epoch));
    const afterRead = await pool.query(
      "SELECT xmin::text AS version FROM aimi.test_demo_stores WHERE id=$1",
      [storeId],
    );
    assert.deepEqual(
      afterRead.rows,
      beforeRead.rows,
      "demo auth/read must not rewrite shared row",
    );
    await repo.transaction([demoUser(meta.epoch)], (s) => {
      s[demoUser(meta.epoch)].balance = 17;
    });
    await Promise.all(
      Array.from({ length: 20 }, () => repo.reserveAI("test", 100)),
    );
    await assert.rejects(
      () => repo.reserveAI("test", 100),
      /DEMO_AI_HOURLY_LIMIT/,
    );
    const reset = await app.inject({
      method: "POST",
      url: "/demo/reset",
      headers,
      payload: {},
    });
    assert.equal(reset.statusCode, 200);
    assert.equal(
      (await app.inject({ url: "/demo/v1/state", headers })).statusCode,
      401,
    );
    await assert.rejects(
      () => repo.transaction([demoUser(meta.epoch)], () => {}),
      /UNAUTHENTICATED/,
    );
    const next = { authorization: "Bearer " + reset.json().data.token };
    const restored = await app.inject({ url: "/demo/v1/state", headers: next });
    assert.equal(restored.json().data.balance, 125);
    const after = await repo.withStore((r) => ({
      calls: r.ai_calls.length,
      end: r.ends_at,
    }));
    assert.equal(after.calls, 20);
    assert.deepEqual(after.end, meta.ends_at);
    assert.equal(
      (await pool.query("SELECT count(*)::int AS n FROM aimi.users")).rows[0].n,
      before.rows[0].n,
    );
  } finally {
    if (beforeKey === undefined) delete process.env.AIMI_GEMINI_API_KEY;
    else process.env.AIMI_GEMINI_API_KEY = beforeKey;
    await app.close();
    await pool.query("DELETE FROM aimi.test_demo_stores WHERE id=$1", [
      storeId,
    ]);
    await pool.end();
  }
});
