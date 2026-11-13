import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { createApp } from "../src/app.js";
import { parseConfig } from "../src/config.js";
test("retired web demo blocks sessions and AI before any database access", async () => {
  const previous = process.env.ENABLE_TEST_DEMO;
  process.env.ENABLE_TEST_DEMO = "true";
  let calls = 0;
  const pool = {
    query: async () => {
      calls++;
      throw Error("No DB access allowed");
    },
  } as unknown as Pool;
  const app = createApp(
    parseConfig({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://localhost/unused",
      SESSION_SIGNING_KEY: "test-only-".repeat(8),
      LOG_LEVEL: "silent",
    }),
    pool,
  );
  try {
    await app.ready();
    calls = 0; // Ignore the normal startup cleanup query.
    for (const path of [
      "/web-demo",
      "/web-demo/session",
      "/web-demo/v1/state",
      "/web-demo/v1/optimizer/jobs",
      "/web-demo/v1/recommendations",
    ]) {
      const response = await app.inject({
        method: "POST",
        url: path,
        payload: { code: "old-demo-code", prompt: "test" },
      });
      assert.equal(response.statusCode, 410, path);
      assert.equal(response.json().error.code, "WEB_DEMO_CLOSED");
    }
    assert.equal(calls, 0);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/auth/anonymous",
          payload: {},
        })
      ).statusCode,
      400,
    );
    assert.equal((await app.inject({ url: "/v1/state" })).statusCode, 401);
  } finally {
    await app.close();
    if (previous === undefined) delete process.env.ENABLE_TEST_DEMO;
    else process.env.ENABLE_TEST_DEMO = previous;
  }
});
