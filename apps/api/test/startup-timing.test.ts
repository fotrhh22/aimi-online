import test from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import Fastify from "fastify";
import type { Pool } from "pg";
import { measuredConnection, measuredQuery, measurePhase, registerStartupTimings } from "../src/observability/startup.js";
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function fixture() {
  const logs: string[] = [];
  let releases = 0;
  const pool = {
    totalCount: 1, idleCount: 0, waitingCount: 0,
    async connect() {
      await wait(3);
      return { async query(sql: string, args?: unknown[]) {
        await wait(3);
        if (sql === "FAIL") throw new Error("private-database-error");
        return { rows: [{ value: args?.[0] }], rowCount: 1 };
      }, release() { releases++; } };
    },
  } as unknown as Pool;
  const app = Fastify({ disableRequestLogging: true, logger: { level: "info", stream: new Writable({
    write(chunk, _encoding, done) { logs.push(String(chunk)); done(); },
  }) } });
  registerStartupTimings(app, pool);
  app.get("/v1/state", async (request, reply) => {
    const count = request.headers["x-test-count"] === "two" ? 2 : 1;
    for (let i = 0; i < count; i++) await measuredQuery(pool, "SELECT private", ["sensitive-value"]);
    await measurePhase("partner", () => wait(2));
    return reply.code(count === 2 ? 200 : 401).send({ data: "not logged" });
  });
  app.get("/v1/content", async () => {
    const client = await measuredConnection(pool);
    try { await client.query("BEGIN"); await client.query("FAIL"); }
    finally { client.release(); }
  });
  app.get("/unmeasured", async () => ({ ok: true }));
  return { app, logs, releases: () => releases };
}
test("startup headers and logs separate concurrent request timings without private content", async () => {
  const f = fixture();
  try {
    const responses = await Promise.all([
      f.app.inject({ url: "/v1/state?secret=do-not-log", headers: { authorization: "Bearer private-token" } }),
      f.app.inject({ url: "/v1/state", headers: { "x-test-count": "two" } }),
    ]);
    assert.deepEqual(responses.map((r) => r.statusCode), [401, 200]);
    for (const r of responses) {
      assert.match(String(r.headers["server-timing"]), /app;dur=.*uptime;dur=.*db_connect;dur=.*db_query;dur=.*partner;dur=/);
      assert.match(String(r.headers["x-request-id"]), /.+/);
      assert.ok(!Number.isNaN(Date.parse(String(r.headers["x-aimi-boot-at"]))));
    }
    const entries = f.logs.map((l) => JSON.parse(l)).filter((l) => l.event === "startup_request");
    assert.equal(entries.length, 2);
    assert.deepEqual(entries.map((e) => e.db_queryCount).sort(), [1, 2]);
    assert.deepEqual(entries.map((e) => e.db_connectCount).sort(), [1, 2]);
    assert.equal(new Set(entries.map((e) => e.requestId)).size, 2);
    assert.equal(f.releases(), 3);
    for (const value of ["private-token", "sensitive-value", "SELECT private", "do-not-log", "not logged"])
      assert.ok(!f.logs.join("").includes(value));
  } finally { await f.app.close(); }
});
test("failed transaction queries remain timed and release remains under caller control", async () => {
  const f = fixture();
  try {
    const result = await f.app.inject("/v1/content");
    assert.equal(result.statusCode, 500);
    const entry = f.logs.map((l) => JSON.parse(l)).find((l) => l.event === "startup_request");
    assert.equal(entry.db_queryCount, 2); assert.equal(entry.db_connectCount, 1);
    assert.equal(f.releases(), 1);
    assert.ok(entry.db_queryMs > 0);
    const other = await f.app.inject("/unmeasured");
    assert.equal(other.headers["server-timing"], undefined);
  } finally { await f.app.close(); }
});
