import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { transformSync } from "esbuild";
import * as contracts from "../../packages/contracts/dist/index.js";
const load = (file, globals = {}) => {
  const code = transformSync(readFileSync(file, "utf8"), {
    loader: "ts",
    format: "cjs",
    define: {
      "import.meta.env.PROD": "true",
      "import.meta.env.VITE_API_BASE_URL": "undefined",
      "import.meta.env.VITE_TEST_DEMO": '"true"',
    },
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, ...globals });
  return module.exports;
};
const { createSessionRecovery } = load(
  "apps/miniapp/src/lib/api/session-recovery.ts",
);
const old = "a".repeat(64),
  fresh = "b".repeat(64);
function client(web = false) {
  const values = new Map([
    [web ? "aimi.web-demo.session" : "aimi.session", old],
    ["aimi.session.kind", "anonymous"],
  ]);
  const events = [],
    calls = [];
  let respond = async () => ({
    status: 200,
    ok: true,
    json: async () => ({ data: {} }),
  });
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, next) => {
      values.set(key, next);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  const api = load("apps/miniapp/src/lib/api/client.ts", {
    require: (name) =>
      name === "../runtime"
        ? { localRuntime: false, webDemoRuntime: web }
        : { createSessionRecovery },
    location: { search: "" },
    URL,
    URLSearchParams,
    crypto: { randomUUID: () => "stable-request-key" },
    localStorage: storage,
    sessionStorage: {},
    AbortController,
    setTimeout,
    clearTimeout,
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    window: { dispatchEvent: (event) => events.push(event.type) },
    fetch: async (url, options) => {
      calls.push({ url, ...options });
      return respond(url, options);
    },
  });
  return {
    api,
    events,
    calls,
    respond: (fn) => {
      respond = fn;
    },
    read: () => api.token(),
    values,
  };
}
const reply = (status, data = {}) => ({
  status,
  ok: status === 200,
  json: async () =>
    status === 200 ? { data } : { error: { code: "UNAUTHENTICATED" } },
});
test("concurrent expired requests share one authentication and preserve mutation idempotency", async () => {
  const c = client();
  let authCalls = 0;
  c.api.configureSessionRecovery(async () => {
    authCalls++;
    await new Promise((r) => setTimeout(r, 5));
    return fresh;
  });
  c.respond(async (_url, options) =>
    reply(options.headers.Authorization === "Bearer " + old ? 401 : 200, {
      balance: 3,
    }),
  );
  const results = await Promise.all([
    c.api.request("/v1/state"),
    c.api.request("/daily-rewards/tip/claim", "POST", {}),
  ]);
  assert.equal(authCalls, 1);
  assert.equal(results[1].balance, 3);
  assert.equal(c.api.isCurrentSession(old), true);
  const writes = c.calls.filter((x) => x.method === "POST");
  assert.equal(writes.length, 2);
  assert.equal(
    writes[0].headers["Idempotency-Key"],
    writes[1].headers["Idempotency-Key"],
  );
  assert.equal(c.events.includes("aimi-session-expired"), false);
});
test("logout during authentication cannot revive or retry the old account", async () => {
  const c = client();
  let finish;
  c.api.configureSessionRecovery(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  c.respond(async () => reply(401));
  const pending = c.api.request("/v1/state");
  await new Promise((r) => setTimeout(r, 0));
  c.api.setToken(null);
  finish(fresh);
  await assert.rejects(pending);
  assert.equal(c.read(), null);
  assert.equal(c.calls.length, 1);
});
test("failed renewal stops after one retry; web/shared demo never use Toss recovery", async () => {
  for (const kind of ["toss", "shared", "web"]) {
    const c = client(kind === "web");
    let authCalls = 0;
    if (kind === "shared") c.api.setToken("demo.test-session");
    c.api.configureSessionRecovery(async () => {
      authCalls++;
      return fresh;
    });
    c.respond(async () => reply(401));
    await assert.rejects(c.api.request("/v1/state"));
    assert.equal(authCalls, kind === "toss" ? 1 : 0);
    assert.equal(c.calls.length, kind === "toss" ? 2 : 1);
    assert.equal(c.read(), null);
  }
});
test("network/server errors do not renew or retry authentication", async () => {
  const c = client();
  let authCalls = 0;
  c.api.configureSessionRecovery(async () => {
    authCalls++;
    return fresh;
  });
  c.respond(async () => reply(503));
  await assert.rejects(c.api.request("/v1/state"));
  assert.equal(authCalls, 0);
  assert.equal(c.calls.length, 1);
  assert.equal(c.read(), old);
});
test("legacy OAuth sessions are never silently retried as a different anonymous account", async () => {
  const c = client();
  let calls = 0;
  c.values.delete("aimi.session.kind");
  c.api.configureSessionRecovery(async () => {
    calls++;
    return fresh;
  });
  c.respond(async () => reply(401));
  await assert.rejects(c.api.request("/v1/state"));
  assert.equal(calls, 0);
  assert.equal(c.calls.length, 1);
});
test("SDK bridge uses new codes, bounds invalid-code retries, and shares start clicks", async () => {
  const c = client();
  let issued = 0;
  let stored;
  const submitted = [];
  const bridge = load("apps/miniapp/src/lib/toss/bridge.ts", {
    require: (name) =>
      name === "@apps-in-toss/web-framework"
        ? {
            NavigationBar: {
              setOptions: () => {
                throw Error("Unsupported host");
              },
            },
            User: {
              createAnonymousKeyAuthCode: async () => ({
                code: "sdk-" + ++issued,
                expiresIn: 300,
              }),
            },
          }
        : name === "@aimi/contracts"
          ? contracts
          : {
              localRuntime: false,
              browserRuntime: false,
              webDemoRuntime: false,
              RequestError: c.api.RequestError,
              configureSessionRecovery: () => {},
              setAnonymousToken: (value) => {
                stored = value;
              },
              request: async (path, method, body) => {
                assert.equal(path, "/auth/anonymous");
                assert.equal(method, "POST");
                submitted.push(body.code);
                if (submitted.length === 1)
                  throw new c.api.RequestError("TOSS_AUTH_CODE_INVALID", 400);
                return { token: fresh, expiresIn: 3600 };
              },
            },
    setTimeout,
    clearTimeout,
  });
  await Promise.all([bridge.login(), bridge.login()]);
  assert.deepEqual(submitted, ["sdk-1", "sdk-2"]);
  assert.equal(issued, 2);
  assert.equal(stored, fresh);
  assert.doesNotThrow(() => bridge.updateNavigation(true));
});

test("simultaneous reads share a request but never cache user state across later reads", async () => {
  const c = client();
  c.respond(async () => {
    await new Promise((r) => setTimeout(r, 5));
    return reply(200, { balance: c.calls.length });
  });
  await Promise.all([c.api.request("/v1/state"), c.api.request("/v1/state")]);
  assert.equal(c.calls.length, 1);
  await c.api.request("/v1/state");
  assert.equal(c.calls.length, 2);
});

test("an old account response is discarded after switching sessions", async () => {
  const c = client();
  let finish;
  c.respond(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  const pending = c.api.request("/v1/state");
  c.api.setToken(fresh);
  finish(reply(200, { balance: 999 }));
  await assert.rejects(pending, /SESSION_CHANGED/);
  assert.equal(c.read(), fresh);
});
