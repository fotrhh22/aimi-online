import test from "node:test";
import assert from "node:assert/strict";
import { proxyDemo } from "../../api/demo.js";
const token =
  "Bearer demo.00000000-0000-4000-8000-000000000001." + "a".repeat(64);
function response() {
  return {
    code: 0,
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(n) {
      this.code = n;
      return this;
    },
    json(v) {
      this.body = v;
      return this;
    },
  };
}
test("web proxy uses only demo routes and forwards only necessary headers", async () => {
  const out = response();
  let target, options;
  await proxyDemo(
    {
      url: "/api/demo?__demo_path=demo/v1/state",
      method: "GET",
      headers: {
        authorization: token,
        cookie: "do-not-forward",
        origin: "evil.invalid",
      },
    },
    out,
    async (u, o) => {
      target = u;
      options = o;
      return new Response(JSON.stringify({ data: { balance: 125 } }), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  assert.equal(target, "https://aimi-online-api.onrender.com/demo/v1/state");
  assert.equal(options.headers.Authorization, token);
  assert.equal(options.headers.cookie, undefined);
  assert.equal(options.headers.origin, undefined);
  assert.equal(out.code, 200);
  assert.equal(out.headers["Cache-Control"], "no-store");
});
test("web proxy cannot reach production, arbitrary hosts or unknown operations", async () => {
  for (const path of [
    "v1/state",
    "auth/toss",
    "https://evil.invalid/demo/session",
    "demo/../v1/state",
    "demo/v1/dev/rewards/tip",
  ]) {
    const out = response();
    await proxyDemo(
      {
        url: "/api/demo?__demo_path=" + encodeURIComponent(path),
        method: "POST",
        headers: {},
        body: {},
      },
      out,
      () => {
        throw Error("must not fetch");
      },
    );
    assert.equal(out.code, 404);
  }
  const out = response();
  await proxyDemo(
    {
      url: "/api/demo/v1/state",
      method: "GET",
      headers: { authorization: "Bearer " + "b".repeat(64) },
    },
    out,
    () => {
      throw Error("must not fetch");
    },
  );
  assert.equal(out.code, 401);
});
test("proxy preserves mutation identity and upstream application errors", async () => {
  const out = response();
  await proxyDemo(
    {
      url: "/api/demo/v1/purchases",
      method: "POST",
      headers: { authorization: token, "idempotency-key": "retry-1" },
      body: { itemId: "flower" },
    },
    out,
    async (_u, o) => {
      assert.equal(o.headers["Idempotency-Key"], "retry-1");
      assert.equal(o.body, '{"itemId":"flower"}');
      return new Response(
        JSON.stringify({ error: { code: "INSUFFICIENT_EP" } }),
        { status: 409, headers: { "content-type": "application/json" } },
      );
    },
  );
  assert.equal(out.code, 409);
  assert.equal(out.body.error.code, "INSUFFICIENT_EP");
});
test("cold start HTML, network errors and oversized bodies get controlled errors", async () => {
  for (const fake of [
    async () => new Response("<html>starting</html>"),
    async () => {
      throw Error("offline");
    },
  ]) {
    const out = response();
    await proxyDemo(
      { url: "/api/demo/status", method: "GET", headers: {} },
      out,
      fake,
    );
    assert.equal(out.code, 503);
    assert.equal(out.body.error.code, "DEMO_UPSTREAM_UNAVAILABLE");
  }
  const out = response();
  await proxyDemo(
    {
      url: "/api/demo/session",
      method: "POST",
      headers: {},
      body: { text: "x".repeat(200001) },
    },
    out,
    () => {
      throw Error("must not fetch");
    },
  );
  assert.equal(out.code, 413);
});

test("web proxy forwards scoped personal sessions without accepting production paths", async () => {
  const out = response();
  const auth =
    "Bearer guest." +
    "b".repeat(64) +
    ".00000000-0000-4000-8000-000000000001." +
    "c".repeat(64);
  await proxyDemo(
    {
      url: "/api/web-demo/v1/state",
      method: "GET",
      headers: { authorization: auth },
    },
    out,
    async (url, options) => {
      assert.equal(
        url,
        "https://aimi-online-api.onrender.com/web-demo/v1/state",
      );
      assert.equal(options.headers.Authorization, auth);
      return new Response(JSON.stringify({ data: { balance: 125 } }), {
        headers: { "content-type": "application/json" },
      });
    },
  );
  assert.equal(out.code, 200);
});
