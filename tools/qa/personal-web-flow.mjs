import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createApp } from "../../apps/api/src/app.ts";
import { createPool } from "../../apps/api/src/db.ts";
import { parseConfig } from "../../apps/api/src/config.ts";
import { registerDemo } from "../../apps/api/src/services/demo/register.ts";
import { accountHash } from "../../apps/api/src/services/demo/personal.ts";
const config = parseConfig({
  ...process.env,
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
});
const pool = createPool(config.DATABASE_URL),
  app = createApp(config, pool);
registerDemo(app, pool, config.SESSION_SIGNING_KEY, undefined, true);
const stores = [],
  root = resolve("apps/miniapp/dist");
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, "http://local").pathname;
    if (path.startsWith("/api/")) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? Buffer.concat(chunks).toString() : undefined;
      const r = await app.inject({
        url: path.slice(4),
        method: req.method,
        headers: req.headers,
        ...(body ? { payload: body } : {}),
      });
      if (path === "/api/web-demo/session" && r.statusCode === 200) {
        const code = r.json().data.accessCode;
        if (code) stores.push("personal-web:" + accountHash(code));
      }
      res
        .writeHead(r.statusCode, { "content-type": "application/json" })
        .end(r.body);
      return;
    }
    const file = resolve(root, "." + path);
    if (!file.startsWith(root + "/") && file !== root) {
      res.writeHead(404).end();
      return;
    }
    let bytes;
    try {
      bytes = await readFile(file);
    } catch {
      bytes = await readFile(root + "/index.html");
    }
    res.setHeader(
      "content-type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
      }[extname(file)] || "text/html",
    );
    res.end(bytes);
  } catch {
    res.writeHead(500).end("QA failure");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const url = "http://127.0.0.1:" + server.address().port;
  await page.goto(url);
  await page
    .getByRole("button", { name: "접속 코드 생성하기", exact: true })
    .click();
  const code = await page.locator(".issued-access-code code").innerText();
  assert.match(code, /^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/);
  assert.equal(
    await page.evaluate(() => localStorage.getItem("aimi.web-demo.session")),
    null,
    "issuing must not auto-login",
  );
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "코드 복사", exact: true }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(copied, code);
  await page.getByLabel("접속 코드", { exact: true }).fill(copied);
  await page.getByRole("button", { name: "시작하기", exact: true }).click();
  await page
    .getByRole("button", { name: "공지", exact: true })
    .waitFor({ timeout: 20000 });
  const first = await page.evaluate(() => ({
    token: localStorage.getItem("aimi.web-demo.session"),
    code: localStorage.getItem("aimi.web-demo.access-code"),
  }));
  assert.ok(first.token.startsWith("guest."));
  assert.equal(first.code, code);
  await page.reload();
  await page.getByRole("button", { name: "공지", exact: true }).waitFor();
  await page.evaluate(() => {
    localStorage.removeItem("aimi.web-demo.session");
  });
  await page.reload();
  await page.getByLabel("접속 코드", { exact: true }).fill(code);
  await page.getByRole("button", { name: "시작하기", exact: true }).click();
  await page.getByRole("button", { name: "공지", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("aimi.web-demo.session")),
    first.token,
  );
  assert.deepEqual(errors, []);
  await mkdir("output/qa/personal-web", { recursive: true });
  await page.screenshot({ path: "output/qa/personal-web/home.png" });
  console.log(
    JSON.stringify({
      passed: true,
      viewport: "393x852",
      checks: [
        "issue without login",
        "copy to clipboard, paste code and login",
        "reload preserves account",
        "restore same account after losing session",
        "no runtime errors",
      ],
    }),
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
  await app.close();
  await pool.query("DELETE FROM aimi.test_demo_stores WHERE id=ANY($1)", [
    stores,
  ]);
  await pool.end();
}
