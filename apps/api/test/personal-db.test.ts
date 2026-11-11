import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool } from "../src/db.js";
import { parseConfig } from "../src/config.js";
import { registerDemo } from "../src/services/demo/register.js";
import { accountHash } from "../src/services/demo/personal.js";

test("personal web accounts: separate wallets/progress, restore, concurrent scope, reset isolation and reciprocal friends", async () => {
  const config = parseConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
  });
  const pool = createPool(config.DATABASE_URL),
    app = createApp(config, pool);
  registerDemo(app, pool, config.SESSION_SIGNING_KEY, undefined, true);
  registerDemo(
    app,
    pool,
    config.SESSION_SIGNING_KEY,
    "integration-unused-" + randomUUID(),
  );
  const stores: string[] = [];
  const call = async (
    path: string,
    token?: string,
    method = "GET",
    payload?: unknown,
  ) => {
    const r = await app.inject({
      url: "/web-demo" + path,
      method: method as "GET" | "POST" | "PUT",
      headers: {
        ...(token ? { authorization: "Bearer " + token } : {}),
        "idempotency-key": randomUUID(),
      },
      ...(payload === undefined ? {} : { payload }),
    });
    assert.equal(r.statusCode, 200, path + " " + r.body);
    return r.json().data;
  };
  try {
    const accounts = [];
    for (let i = 0; i < 2; i++) {
      const a = await call("/session", undefined, "POST", { create: true });
      stores.push("personal-web:" + accountHash(a.accessCode));
      accounts.push(a);
    }
    const [a, b] = accounts;
    assert.notEqual(a.accessCode, b.accessCode);
    const [as, bs] = await Promise.all([
      call("/v1/state", a.token),
      call("/v1/state", b.token),
    ]);
    assert.notEqual(as.code, bs.code);
    await call("/daily-rewards/attendance/claim", a.token, "POST", {});
    const results = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        call("/v1/state", i % 2 ? a.token : b.token),
      ),
    );
    results.forEach((r, i) => assert.equal(r.balance, i % 2 ? 128 : 125));
    const restored = await call("/session", undefined, "POST", {
      code: a.accessCode.toLowerCase(),
    });
    assert.equal((await call("/v1/state", restored.token)).balance, 128);
    assert.equal(
      (
        await app.inject({
          url: "/demo/v1/state",
          headers: { authorization: "Bearer " + a.token },
        })
      ).statusCode,
      401,
    );
    const forged = a.token.replace(/.$/, a.token.endsWith("0") ? "1" : "0");
    assert.equal(
      (
        await app.inject({
          url: "/web-demo/v1/state",
          headers: { authorization: "Bearer " + forged },
        })
      ).statusCode,
      401,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/web-demo/session",
          payload: { code: "F".repeat(32) },
        })
      ).statusCode,
      404,
    );
    // No access by merely knowing another user's public friend ID.
    const bid = b.token.split(".")[2];
    assert.equal(
      (
        await app.inject({
          url: "/web-demo/v1/friends/demo-player-" + bid + "/garden",
          headers: { authorization: "Bearer " + a.token },
        })
      ).statusCode,
      403,
    );
    await call("/v1/social/actions", a.token, "POST", {
      action: "request",
      code: bs.code,
    });
    const incoming = await call("/v1/social", b.token);
    assert.ok(
      incoming.people.some(
        (p: { code: string; request: boolean }) =>
          p.code === as.code && p.request,
      ),
    );
    await call("/v1/social/actions", b.token, "POST", {
      action: "accept",
      code: as.code,
    });
    await call("/v1/friends/demo-player-" + bid + "/garden", a.token);
    const reset = await call("/reset", a.token, "POST", {});
    assert.equal((await call("/v1/state", reset.token)).balance, 125);
    assert.equal((await call("/v1/state", b.token)).balance, 125);
    assert.equal(
      (
        await app.inject({
          url: "/web-demo/v1/state",
          headers: { authorization: "Bearer " + a.token },
        })
      ).statusCode,
      401,
    );
    const again = await call("/session", undefined, "POST", {
      code: a.accessCode,
    });
    assert.equal(again.token, reset.token);
    // No plaintext credential is saved in the DB JSON.
    const rows = await pool.query(
      "SELECT state::text FROM aimi.test_demo_stores WHERE id=ANY($1)",
      [stores],
    );
    for (const row of rows.rows)
      for (const a of accounts) assert.ok(!row.state.includes(a.accessCode));
  } finally {
    await app.close();
    await pool.query("DELETE FROM aimi.test_demo_stores WHERE id=ANY($1)", [
      stores,
    ]);
    await pool.end();
  }
});
