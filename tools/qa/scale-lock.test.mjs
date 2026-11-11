import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import vm from "node:vm";
const code = transformSync(
  readFileSync("apps/miniapp/src/lib/scale-lock.ts", "utf8"),
  { loader: "ts", format: "cjs" },
).code;
const policy = { exports: {} };
vm.runInNewContext(
  transformSync(readFileSync("apps/miniapp/src/lib/scale-policy.ts", "utf8"), {
    loader: "ts",
    format: "cjs",
  }).code,
  { module: policy, exports: policy.exports },
);
function setup(toss) {
  const listeners = new Map();
  let viewport = "";
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) =>
      name.includes("runtime") ? { tossRuntime: toss } : policy.exports,
    document: {
      querySelector: () => ({ setAttribute: (_k, v) => (viewport = v) }),
      addEventListener: (k, fn, opts) => {
        assert.equal(opts.passive, false);
        listeners.set(k, fn);
      },
      removeEventListener: (k) => listeners.delete(k),
    },
  });
  const cleanup = module.exports.installScaleLock();
  return {
    listeners,
    cleanup,
    get viewport() {
      return viewport;
    },
  };
}
test("Toss blocks scale gestures and keeps single-finger scrolling", () => {
  const s = setup(true);
  assert.match(s.viewport, /minimum-scale=1.0/);
  assert.match(s.viewport, /maximum-scale=1.0/);
  assert.match(s.viewport, /user-scalable=no/);
  let prevented = 0;
  const event = {
    cancelable: true,
    preventDefault() {
      prevented++;
    },
    touches: [{}],
  };
  s.listeners.get("touchmove")(event);
  assert.equal(prevented, 0);
  event.touches.push({});
  s.listeners.get("touchmove")(event);
  assert.equal(prevented, 1);
  s.listeners.get("gesturestart")(event);
  assert.equal(prevented, 2);
  s.cleanup();
  assert.equal(s.listeners.size, 0);
});
test("web demo does not install a scale lock", () => {
  const s = setup(false);
  assert.equal(s.viewport, "");
  assert.equal(s.listeners.size, 0);
  s.cleanup();
});
