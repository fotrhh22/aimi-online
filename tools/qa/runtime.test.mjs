import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { transformSync } from "esbuild";
import vm from "node:vm";
const source = readFileSync("apps/miniapp/src/lib/runtime.ts", "utf8");
for (const [name, dev, kind, host, expected] of [
  [
    "installed Toss on loopback origin",
    false,
    "toss",
    "localhost",
    { toss: true, local: false, browser: false },
  ],
  [
    "installed Toss on public origin",
    false,
    "toss",
    "aimi.tossmini.com",
    { toss: true, local: false, browser: false },
  ],
  [
    "local developer preview",
    true,
    "",
    "127.0.0.1",
    { toss: false, local: true, browser: true },
  ],
  [
    "Vercel web demo",
    false,
    "web-demo",
    "aimi.vercel.app",
    { toss: false, local: false, browser: true },
  ],
])
  test(name, () => {
    const code = transformSync(source, {
      loader: "ts",
      format: "cjs",
      define: {
        "import.meta.env.DEV": String(dev),
        "import.meta.env.VITE_APP_RUNTIME": JSON.stringify(kind),
      },
    }).code;
    const module = { exports: {} };
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      location: { hostname: host },
    });
    const v = module.exports;
    assert.equal(v.tossRuntime, expected.toss);
    assert.equal(v.localRuntime, expected.local);
    assert.equal(v.browserRuntime, expected.browser);
  });
