import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createPool } from "../src/db.js";
import { parseConfig } from "../src/config.js";
import { createApp } from "../src/app.js";
import { PostgresRepository } from "../src/modules/repository.js";
import { once, purchase, saveGarden } from "../src/modules/domain.js";
test("PostgreSQL v1: atomic purchase/ledger, revision, quota, friends, account deletion", async () => {
  const config = parseConfig({
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      ENABLE_DEV_AUTH: "true",
      LOG_LEVEL: "silent",
    }),
    pool = createPool(localTestUrl(config.DATABASE_URL)),
    app = createApp(config, pool),
    repo = new PostgresRepository(pool),
    ids: string[] = [];
  try {
    async function account() {
      const subject = "v1_" + randomUUID().replaceAll("-", ""),
        r = await app.inject({
          method: "POST",
          url: "/auth/dev",
          payload: { subject },
        });
      assert.equal(r.statusCode, 200);
      const id = (
        await pool.query("SELECT id FROM aimi.users WHERE dev_subject=$1", [
          subject,
        ])
      ).rows[0].id;
      ids.push(id);
      await repo.transaction([id], (s) => {
        s[id].balance += 125;
      });
      const state = (
        await app.inject({
          url: "/v1/state",
          headers: { authorization: "Bearer " + r.json().data.token },
        })
      ).json().data;
      return {
        id,
        headers: { authorization: "Bearer " + r.json().data.token },
        state,
      };
    }
    const a = await account(),
      b = await account();
    const beforeRead = await pool.query(
      "SELECT user_id,xmin::text AS version FROM aimi.prototype_states WHERE user_id=ANY($1::uuid[]) ORDER BY user_id",
      [[a.id, b.id]],
    );
    assert.equal(Object.keys(await repo.readMany([a.id, b.id])).length, 2);
    await Promise.all([repo.read(a.id), repo.read(b.id)]);
    const afterRead = await pool.query(
      "SELECT user_id,xmin::text AS version FROM aimi.prototype_states WHERE user_id=ANY($1::uuid[]) ORDER BY user_id",
      [[a.id, b.id]],
    );
    assert.deepEqual(
      afterRead.rows,
      beforeRead.rows,
      "reads must not write a new row version",
    );
    const purchaseResponses = await Promise.all(
      Array.from({ length: 12 }, () =>
        app.inject({
          method: "POST",
          url: "/v1/purchases",
          headers: { ...a.headers, "idempotency-key": "one-purchase-key" },
          payload: { itemId: "plant" },
        }),
      ),
    );
    assert.ok(purchaseResponses.every((r) => r.statusCode === 200));
    const state = await repo.read(a.id);
    assert.equal(state.balance, 65);
    assert.equal(state.inventory.filter((x) => x === "plant").length, 1);
    const ledger = await pool.query(
      "SELECT sum(delta)::int AS total FROM aimi.ep_ledger WHERE user_id=$1",
      [a.id],
    );
    assert.equal(ledger.rows[0].total, 65);
    // Simulate an existing persisted slot-based garden, then exercise the real API read/save path.
    await pool.query(
      "UPDATE aimi.prototype_states SET state=jsonb_set(state #- '{garden,placements}', '{garden,slots}', $2::jsonb) WHERE user_id=$1",
      [a.id, JSON.stringify({ "front-left": "plant" })],
    );
    const legacyRead = await app.inject({
      url: "/v1/state",
      headers: a.headers,
    });
    assert.equal(legacyRead.json().data.garden.placements[0].itemId, "plant");
    const saves = await Promise.all(
      [1, 2].map((n) =>
        app.inject({
          method: "PUT",
          url: "/v1/garden",
          headers: { ...a.headers, "idempotency-key": "garden-save-" + n },
          payload: {
            revision: 0,
            character: "seed",
            placements: [{ itemId: "plant", x: 0.8, y: 0.5 }],
          },
        }),
      ),
    );
    assert.deepEqual(saves.map((x) => x.statusCode).sort(), [200, 409]);
    async function social(
      headers: typeof a.headers,
      action: string,
      code: string,
    ) {
      return app.inject({
        method: "POST",
        url: "/v1/social/actions",
        headers: { ...headers, "idempotency-key": randomUUID() },
        payload: { action, code },
      });
    }
    assert.equal(
      (await social(a.headers, "request", b.state.code)).statusCode,
      200,
    );
    assert.equal(
      (await social(b.headers, "accept", a.state.code)).statusCode,
      200,
    );
    assert.equal(
      (
        await app.inject({
          url: "/v1/friends/" + b.id + "/garden",
          headers: a.headers,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await social(b.headers, "block", a.state.code)).statusCode,
      200,
    );
    assert.equal(
      (
        await app.inject({
          url: "/v1/friends/" + b.id + "/garden",
          headers: a.headers,
        })
      ).statusCode,
      403,
    );
    const date = "2099-01-01";
    await pool.query("DELETE FROM aimi.ai_daily_usage WHERE local_date=$1", [
      date,
    ]);
    const calls = await Promise.allSettled(
      Array.from({ length: 8 }, () => repo.reserveAI(date, 3)),
    );
    assert.equal(calls.filter((r) => r.status === "fulfilled").length, 3);
    await pool.query("DELETE FROM aimi.ai_daily_usage WHERE local_date=$1", [
      date,
    ]);
    assert.equal(
      (
        await app.inject({
          method: "DELETE",
          url: "/v1/account",
          headers: a.headers,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ url: "/v1/state", headers: a.headers })).statusCode,
      401,
    );
  } finally {
    for (const id of ids) {
      await pool.query(
        "DELETE FROM aimi.daily_reward_claims WHERE user_id=$1",
        [id],
      );
      await pool.query("DELETE FROM aimi.users WHERE id=$1", [id]);
    }
    await app.close();
    await pool.end();
  }
});
test("PostgreSQL v1: verified game completion and challenge system error do not duplicate/consume", async () => {
  const config = parseConfig({
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      ENABLE_DEV_AUTH: "true",
      LOG_LEVEL: "silent",
    }),
    pool = createPool(localTestUrl(config.DATABASE_URL)),
    app = createApp(config, pool),
    repo = new PostgresRepository(pool);
  let uid: string | undefined;
  try {
    const subject = "game_" + randomUUID().replaceAll("-", ""),
      login = await app.inject({
        method: "POST",
        url: "/auth/dev",
        payload: { subject },
      }),
      headers = { authorization: "Bearer " + login.json().data.token };
    uid = (
      await pool.query("SELECT id FROM aimi.users WHERE dev_subject=$1", [
        subject,
      ])
    ).rows[0].id;
    const start = await app.inject({
      method: "POST",
      url: "/v1/game-plays",
      headers: { ...headers, "idempotency-key": "game-start-test" },
      payload: {},
    });
    assert.equal(start.statusCode, 200);
    const play = start.json().data;
    // Fixture time adjustment in disposable test DB, not a production bypass.
    await repo.transaction([uid!], (s) => {
      s[uid!].plays[play.id].startedAt -= 100000;
    });
    const finish = await app.inject({
      method: "POST",
      url: "/v1/game-plays/" + play.id + "/complete",
      headers: { ...headers, "idempotency-key": "game-finish-test" },
      payload: { ticks: 0, inputs: [], abandon: true },
    });
    assert.equal(finish.statusCode, 200);
    const before = (await repo.read(uid!)).balance;
    const bad = await app.inject({
      method: "POST",
      url: "/v1/challenge/attempts",
      headers: { ...headers, "idempotency-key": "missing-image" },
      payload: { keywordIds: ["cat"], model: "low", date: play.date },
    });
    assert.equal(bad.statusCode, 503);
    assert.equal((await repo.read(uid!)).days[play.date].attemptsUsed, 0);
    assert.equal((await repo.read(uid!)).balance, before);
  } finally {
    if (uid) await pool.query("DELETE FROM aimi.users WHERE id=$1", [uid]);
    await app.close();
    await pool.end();
  }
});

function localTestUrl(url: string) {
  assert.ok(
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname),
    "DB tests require an isolated local PostgreSQL",
  );
  return url;
}
import { createHmac } from "node:crypto";
test("Toss unlink callback preserves int64 and revokes sessions only with configured Basic auth", async () => {
  const config = parseConfig({
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      ENABLE_DEV_AUTH: "true",
      LOG_LEVEL: "silent",
    }),
    pool = createPool(localTestUrl(config.DATABASE_URL)),
    before = process.env.TOSS_UNLINK_BASIC_AUTH;
  process.env.TOSS_UNLINK_BASIC_AUTH =
    "Basic " + Buffer.from("synthetic:callback").toString("base64");
  const app = createApp(config, pool),
    rawKey = "9223372036854775807";
  let uid: string | undefined;
  try {
    const key = createHmac("sha256", config.SESSION_SIGNING_KEY)
      .update("toss-user:" + rawKey)
      .digest("hex");
    const row = await pool.query(
      "INSERT INTO aimi.users(toss_user_key) VALUES($1) RETURNING id",
      [key],
    );
    uid = row.rows[0].id;
    await pool.query(
      "INSERT INTO aimi.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      ["synthetic-callback-session", uid],
    );
    const payload = '{"userKey":' + rawKey + ',"referrer":"UNLINK"}';
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/auth/toss/unlink-callback",
          headers: {
            "content-type": "application/json",
            authorization: "Basic invalid",
          },
          payload,
        })
      ).statusCode,
      401,
    );
    const response = await app.inject({
      method: "POST",
      url: "/auth/toss/unlink-callback",
      headers: {
        "content-type": "application/json",
        authorization: process.env.TOSS_UNLINK_BASIC_AUTH,
      },
      payload,
    });
    assert.equal(response.statusCode, 200);
    assert.equal(
      (await pool.query("SELECT 1 FROM aimi.sessions WHERE user_id=$1", [uid]))
        .rowCount,
      0,
    );
  } finally {
    if (before === undefined) delete process.env.TOSS_UNLINK_BASIC_AUTH;
    else process.env.TOSS_UNLINK_BASIC_AUTH = before;
    if (uid) await pool.query("DELETE FROM aimi.users WHERE id=$1", [uid]);
    await app.close();
    await pool.end();
  }
});
