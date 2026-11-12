import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { createApp } from "../src/app.js";
import { createPool, ApiError } from "../src/db.js";
import { parseConfig } from "../src/config.js";

test("anonymous DB: stable identity, concurrent first login, isolated wallets, social, expiry and deletion", async () => {
  const config = parseConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
  });
  assert.ok(
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(config.DATABASE_URL).hostname,
    ),
  );
  const pool = createPool(config.DATABASE_URL),
    namespace = randomUUID();
  let serial = 0;
  const codes = new Map<string, string>();
  const app = createApp(config, pool, {
    exchangeAnonymousCode: async (code) => {
      const key = codes.get(code);
      codes.delete(code);
      if (!key) throw new ApiError("TOSS_AUTH_CODE_INVALID", 400);
      return key;
    },
  });
  const hash = (value: string) =>
    createHmac("sha256", config.SESSION_SIGNING_KEY)
      .update(value)
      .digest("hex");
  const identities = ["alice", "bob"].map((who) => namespace + who);
  const login = async (key: string) => {
    const code = "single-use-" + serial++;
    codes.set(code, key);
    const response = await app.inject({
      method: "POST",
      url: "/auth/anonymous",
      payload: { code },
    });
    assert.equal(response.statusCode, 200);
    return { code, token: response.json().data.token as string };
  };
  const headers = (token: string) => ({ authorization: "Bearer " + token });
  const get = async (path: string, token: string) => {
    const response = await app.inject({ url: path, headers: headers(token) });
    assert.equal(response.statusCode, 200);
    return response.json().data;
  };
  const action = async (token: string, body: object) => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/social/actions",
      headers: { ...headers(token), "idempotency-key": randomUUID() },
      payload: body,
    });
    assert.equal(response.statusCode, 200);
  };
  try {
    const [a1, a2, b] = await Promise.all([
      login(identities[0]),
      login(identities[0]),
      login(identities[1]),
    ]);
    const rows = await pool.query(
      "SELECT id,toss_anon_key FROM aimi.users WHERE toss_anon_key=ANY($1)",
      [identities.map((key) => hash("toss-anon:" + key))],
    );
    assert.equal(
      rows.rowCount,
      2,
      "simultaneous first login must not duplicate a user",
    );
    const a = await get("/v1/state", a1.token),
      again = await get("/v1/state", a2.token),
      other = await get("/v1/state", b.token);
    assert.equal(
      a.balance,
      0,
      "real users never inherit the shared demo's 125EP",
    );
    assert.equal(a.code, again.code);
    assert.notEqual(a.code, other.code);
    assert.equal((await get("/v1/social", a1.token)).people.length, 0);
    const claim = await app.inject({
      method: "POST",
      url: "/daily-rewards/attendance/claim",
      headers: { ...headers(a1.token), "idempotency-key": randomUUID() },
      payload: {},
    });
    assert.equal(claim.statusCode, 200);
    const claimed = (await get("/v1/state", a1.token)).balance;
    assert.ok(claimed > 0);
    assert.equal((await get("/v1/state", b.token)).balance, 0);
    await action(a1.token, { action: "request", code: other.code });
    await action(b.token, { action: "accept", code: a.code });
    const social = await get("/v1/social", a1.token);
    assert.equal(social.people.length, 1);
    assert.equal(social.people[0].code, other.code);
    const visit = await get(
      "/v1/friends/" + social.people[0].id + "/garden",
      a1.token,
    );
    assert.ok(visit.garden);
    // Expired own session cannot access state; a fresh SDK code restores the same account.
    await pool.query(
      "UPDATE aimi.sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
      [hash(a1.token)],
    );
    assert.equal(
      (await app.inject({ url: "/v1/state", headers: headers(a1.token) }))
        .statusCode,
      401,
    );
    const restored = await login(identities[0]);
    const state = await get("/v1/state", restored.token);
    assert.equal(state.code, a.code);
    assert.equal(state.balance, claimed);
    assert.equal(
      (await get("/v1/social", restored.token)).people[0].code,
      other.code,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/auth/anonymous",
          payload: { code: restored.code },
        })
      ).statusCode,
      400,
    );
    const deletion = await app.inject({
      method: "DELETE",
      url: "/v1/account",
      headers: headers(restored.token),
    });
    assert.equal(
      deletion.statusCode,
      200,
      "anonymous deletion needs no Toss OAuth unlink",
    );
    assert.equal(
      (await app.inject({ url: "/v1/state", headers: headers(a2.token) }))
        .statusCode,
      401,
    );
    assert.equal((await get("/v1/social", b.token)).people.length, 0);
  } finally {
    const ids = (
      await pool.query(
        "SELECT id FROM aimi.users WHERE toss_anon_key=ANY($1)",
        [identities.map((key) => hash("toss-anon:" + key))],
      )
    ).rows.map((r) => r.id);
    await pool.query(
      "DELETE FROM aimi.daily_reward_claims WHERE user_id=ANY($1::uuid[])",
      [ids],
    );
    await pool.query("DELETE FROM aimi.users WHERE id=ANY($1::uuid[])", [ids]);
    await app.close();
    await pool.end();
  }
});
