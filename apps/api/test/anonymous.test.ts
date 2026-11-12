import test, { mock } from "node:test";
import https from "node:https";
import { EventEmitter } from "node:events";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exchangeAnonymousCode } from "../src/services/toss/anonymous.js";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { createApp } from "../src/app.js";
import { parseConfig } from "../src/config.js";
import { ApiError } from "../src/db.js";
import { partnerError } from "../src/services/toss/client.js";

const config = parseConfig({
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://localhost/unused",
  SESSION_SIGNING_KEY: "test-only-".repeat(8),
  LOG_LEVEL: "silent",
});
test("anonymous exchange uses the fixed partner endpoint, mTLS and response envelope", async () => {
  const folder = mkdtempSync(join(tmpdir(), "aimi-auth-transport-"));
  const cert = process.env.TOSS_CLIENT_CERT_PATH,
    key = process.env.TOSS_CLIENT_KEY_PATH;
  writeFileSync(join(folder, "cert"), "test-certificate-only");
  writeFileSync(join(folder, "key"), "test-private-key-only");
  process.env.TOSS_CLIENT_CERT_PATH = join(folder, "cert");
  process.env.TOSS_CLIENT_KEY_PATH = join(folder, "key");
  let envelope: unknown = {
    resultType: "SUCCESS",
    success: { anonKey: "server-verified-key" },
  };
  let sent = "";
  const transport = mock.method(https, "request", ((
    options: https.RequestOptions,
    cb: (res: EventEmitter) => void,
  ) => {
    assert.equal(options.hostname, "apps-in-toss-api.toss.im");
    assert.equal(
      options.path,
      "/api-partner/v1/apps-in-toss/users/anon-key/exchange",
    );
    assert.equal(options.rejectUnauthorized, true);
    assert.ok(options.cert);
    assert.ok(options.key);
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      undefined,
    );
    const req = new EventEmitter() as EventEmitter & {
      write: (body: string) => void;
      end: () => void;
      destroy: () => void;
    };
    req.write = (body) => {
      sent = body;
    };
    req.destroy = () => {};
    req.end = () => {
      queueMicrotask(() => {
        const res = Object.assign(new EventEmitter(), { statusCode: 200 });
        cb(res);
        res.emit("data", Buffer.from(JSON.stringify(envelope)));
        res.emit("end");
      });
    };
    return req;
  }) as typeof https.request);
  try {
    assert.equal(await exchangeAnonymousCode("once"), "server-verified-key");
    assert.deepEqual(JSON.parse(sent), { code: "once" });
    envelope = {
      resultType: "FAIL",
      error: { errorCode: "4011" },
      success: null,
    };
    await assert.rejects(
      exchangeAnonymousCode("used"),
      /TOSS_AUTH_CODE_INVALID/,
    );
    envelope = { resultType: "FAIL", error: { errorCode: "4095" } };
    await assert.rejects(
      exchangeAnonymousCode("rate"),
      /TOSS_AUTH_RATE_LIMITED/,
    );
    envelope = { resultType: "SUCCESS", success: { hash: "wrong-shape" } };
    await assert.rejects(
      exchangeAnonymousCode("malformed"),
      /TOSS_AUTH_FAILED/,
    );
  } finally {
    transport.mock.restore();
    if (cert === undefined) delete process.env.TOSS_CLIENT_CERT_PATH;
    else process.env.TOSS_CLIENT_CERT_PATH = cert;
    if (key === undefined) delete process.env.TOSS_CLIENT_KEY_PATH;
    else process.env.TOSS_CLIENT_KEY_PATH = key;
    rmSync(folder, { recursive: true });
  }
});
test("anonymous auth refuses supplied identities before exchange or DB access", async () => {
  let exchanges = 0;
  const app = createApp(config, {} as Pool, {
    exchangeAnonymousCode: async () => {
      exchanges++;
      return "verified";
    },
  });
  try {
    for (const payload of [
      { anonKey: "forged" },
      { code: "valid", anonKey: "forged" },
      { code: " " },
      { code: "x".repeat(2049) },
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/auth/anonymous",
        payload,
      });
      assert.equal(response.statusCode, 400);
    }
    assert.equal(exchanges, 0);
  } finally {
    await app.close();
  }
});
test("expired/replayed codes and provider failures cannot create a member/session", async () => {
  const app = createApp(config, {} as Pool, {
    exchangeAnonymousCode: async (code) => {
      if (code === "bad") throw new ApiError("TOSS_AUTH_CODE_INVALID", 400);
      if (code === "limit") throw new ApiError("TOSS_AUTH_RATE_LIMITED", 429);
      return "";
    },
  });
  try {
    for (const [code, status] of [
      ["bad", 400],
      ["limit", 429],
      ["invalid-response", 502],
    ] as const) {
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/auth/anonymous",
            payload: { code },
          })
        ).statusCode,
        status,
      );
    }
    assert.equal(
      partnerError({ error: { errorCode: "4011" } }).code,
      "TOSS_AUTH_CODE_INVALID",
    );
    assert.equal(partnerError({ error: { errorCode: "4095" } }).status, 429);
    assert.equal(partnerError({}).status, 502);
  } finally {
    await app.close();
  }
});
