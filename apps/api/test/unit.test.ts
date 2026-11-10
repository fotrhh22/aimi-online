import test from "node:test";
import assert from "node:assert/strict";
import { seoulDate, EmptyBody, IdempotencyKey } from "@aimi/contracts";
import { parseConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import type { Pool } from "pg";

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/postgres",
  SESSION_SIGNING_KEY: "a".repeat(64),
  HOST: "127.0.0.1",
  LOG_LEVEL: "silent",
};
test("Korean date switches at UTC 15:00", () => {
  assert.equal(seoulDate(new Date("2026-11-08T14:59:59Z")), "2026-11-08");
  assert.equal(seoulDate(new Date("2026-11-08T15:00:00Z")), "2026-11-09");
});
test("development auth cannot be enabled in production, Render or on public interfaces", () => {
  for (const extras of [
    { NODE_ENV: "production" },
    { RENDER: "true" },
    { HOST: "0.0.0.0" },
  ]) {
    assert.throws(() =>
      parseConfig({ ...base, ENABLE_DEV_AUTH: "true", ...extras }),
    );
  }
  assert.equal(
    parseConfig({ ...base, ENABLE_DEV_AUTH: "false" }).ENABLE_DEV_AUTH,
    "false",
  );
});
test("reject mutation payloads and unsafe idempotency keys", () => {
  assert.equal(EmptyBody.safeParse({ amount: 999 }).success, false);
  assert.equal(IdempotencyKey.safeParse("short").success, false);
});
test("production has no dev login and unauthenticated wallet is rejected", async () => {
  const app = createApp(
    parseConfig({ ...base, NODE_ENV: "production" }),
    {} as Pool,
  );
  try {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/auth/dev",
          payload: { subject: "attacker" },
        })
      ).statusCode,
      404,
    );
    assert.equal((await app.inject("/wallet")).statusCode, 401);
    assert.equal((await app.inject("/health/live")).statusCode, 200);
  } finally {
    await app.close();
  }
});

import { dailyProgramForDate } from "../src/services/content/daily-program.js";
import { registerPrototype } from "../src/modules/routes.js";
import { FileRepository } from "../src/modules/repository.js";
import Fastify from "fastify";
test("weekly games repeat by weekday and ten daily tips cycle at the Korean date boundary", () => {
  const kinds = [
    "crossing",
    "dino",
    "runner",
    "crossing",
    "dino",
    "runner",
    "crossing",
  ];
  for (let n = 0; n < 7; n++) {
    const date = new Date(Date.UTC(2026, 10, 9 + n)).toISOString().slice(0, 10);
    assert.equal(dailyProgramForDate(date).gameKind, kinds[n]);
    const nextWeek = new Date(Date.UTC(2026, 10, 16 + n))
      .toISOString()
      .slice(0, 10);
    assert.equal(dailyProgramForDate(nextWeek).gameKind, kinds[n]);
  }
  const ids = Array.from(
    { length: 10 },
    (_, n) =>
      dailyProgramForDate(
        new Date(Date.UTC(2026, 10, 11 + n)).toISOString().slice(0, 10),
      ).todayTip.id,
  );
  assert.equal(new Set(ids).size, 10);
  assert.equal(dailyProgramForDate("2026-11-21").todayTip.id, ids[0]);
  assert.notEqual(
    dailyProgramForDate(seoulDate(new Date("2026-11-11T14:59:59Z"))).todayTip
      .id,
    dailyProgramForDate(seoulDate(new Date("2026-11-11T15:00:00Z"))).todayTip
      .id,
  );
  assert.throws(
    () => dailyProgramForDate("2026-02-30"),
    /INVALID_CONTENT_DATE/,
  );
});
test("game API forbids test overrides and state serves the scheduled daily tip", async () => {
  const app = Fastify(),
    repo = new FileRepository();
  registerPrototype(app, repo, async () => "schedule-user");
  app.setErrorHandler((err, _r, reply) =>
    reply
      .code((err as any).status ?? 500)
      .send({ error: { code: (err as any).code } }),
  );
  try {
    const state = (await app.inject({ url: "/v1/state" })).json().data;
    const expected = dailyProgramForDate(state.daily.date);
    assert.deepEqual(state.todayTip, expected.todayTip);
    assert.equal(state.daily.gameKind, expected.gameKind);
    const rejected = await app.inject({
      method: "POST",
      url: "/v1/game-plays",
      headers: { "idempotency-key": "override-blocked" },
      payload: { kind: "dino" },
    });
    assert.equal(rejected.statusCode, 403);
    assert.equal(
      (await repo.read("schedule-user")).days[state.daily.date],
      undefined,
    );
    const started = await app.inject({
      method: "POST",
      url: "/v1/game-plays",
      headers: { "idempotency-key": "scheduled-game" },
      payload: {},
    });
    assert.equal(started.statusCode, 200);
    assert.equal(started.json().data.kind, expected.gameKind);
    assert.equal(
      (await app.inject({ url: "/v1/state" })).json().data.daily.playsUsed,
      1,
    );
  } finally {
    await app.close();
  }
});
