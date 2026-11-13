import test from "node:test";
import assert from "node:assert/strict";
import { proxyDemo } from "../../api/demo.js";
test("retired Vercel proxy rejects old and new routes without any upstream requests", async () => {
  for (const path of [
    "web-demo/session",
    "web-demo/v1/optimizer/jobs",
    "web-demo/v1/recommendations",
    "demo/v1/optimizer/jobs",
    "v1/state",
  ]) {
    let calls = 0;
    const out = {
      setHeader(k, v) {
        this.cache = v;
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
    await proxyDemo(
      { url: "/api/demo?__demo_path=" + path, method: "POST", headers: {} },
      out,
      async () => {
        calls++;
        throw Error("No network allowed");
      },
    );
    assert.equal(out.code, 410);
    assert.equal(out.body.error.code, "WEB_DEMO_CLOSED");
    assert.equal(out.cache, "no-store");
    assert.equal(calls, 0);
  }
});
