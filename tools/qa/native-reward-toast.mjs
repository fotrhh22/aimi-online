import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { proxyDemo } from "../../api/demo.js";
const root = resolve("apps/miniapp/dist");
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://local").pathname;
  if (path.startsWith("/api/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    try {
      req.body = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {};
    } catch {
      res.writeHead(400).end();
      return;
    }
    const send = {
      setHeader: (k, v) => res.setHeader(k, v),
      status(n) {
        res.statusCode = n;
        return this;
      },
      json(v) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify(v));
      },
    };
    return proxyDemo(req, send);
  }
  const file = resolve(root, "." + path);
  if (!file.startsWith(root + "/") && file !== root) {
    res.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.setHeader(
      "content-type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".png": "image/png",
        ".html": "text/html",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.setHeader("content-type", "text/html");
    res.end(await readFile(root + "/index.html"));
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
try {
  const session = await fetch(
    "https://aimi-online-api.onrender.com/demo/session",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    },
  ).then((r) => r.json());
  const token = session.data.token,
    headers = { Authorization: "Bearer " + token };
  const [sj, cj] = await Promise.all(
    ["state", "content"].map((p) =>
      fetch("https://aimi-online-api.onrender.com/demo/v1/" + p, {
        headers,
      }).then((r) => r.json()),
    ),
  );
  const state = sj.data;
  let claimed = false;
  state.pendingChallengeReward = { id: "qa-reward", ep: 15 };
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await page.addInitScript(
    (token) => localStorage.setItem("aimi.web-demo.session", token),
    token,
  );
  await page.route("**/api/**", async (r) => {
    const path = new URL(r.request().url()).pathname;
    let data = {};
    if (path.endsWith("/reward")) {
      claimed = true;
      data = { credited: 15, balance: 140 };
    } else if (path.endsWith("/v1/state"))
      data = {
        ...state,
        pendingChallengeReward: claimed ? null : state.pendingChallengeReward,
      };
    else if (path.endsWith("/v1/content")) data = cj.data;
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data }),
    });
  });
  await page.goto("http://127.0.0.1:" + port);
  await page.getByRole("dialog").waitFor();
  await page.evaluate(() => {
    document.documentElement.dataset.aimiHost = "toss";
    document.documentElement.style.setProperty("--sdk-safe-top", "59px");
    document.documentElement.style.setProperty("--sdk-safe-bottom", "34px");
    document.querySelector(".dev-platform")?.remove();
  });
  assert.ok(
    (await page
      .getByRole("dialog")
      .evaluate((n) => n.getBoundingClientRect().top)) >= 107,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "\ud655\uc778", exact: true })
    .click();
  await page.locator(".toast-reward").waitFor();
  const style = await page.locator(".toast-reward").evaluate((n) => ({
    text: n.textContent,
    background: getComputedStyle(n).backgroundColor,
    weight: getComputedStyle(n).fontWeight,
    fontSize: getComputedStyle(n).fontSize,
    border: getComputedStyle(n).borderTopWidth,
  }));
  assert.match(style.text, /15 EP/);
  assert.notEqual(style.background, "rgba(0, 0, 0, 0)");
  assert.equal(style.weight, "500");
  assert.equal(style.fontSize, "11px");
  assert.equal(style.border, "1px");
  assert.match(style.background, /0\.12/);
  await mkdir("output/qa/scroll-audit", { recursive: true });
  await page.screenshot({ path: "output/qa/scroll-audit/reward-toast.png" });
  console.log(
    JSON.stringify({
      passed: true,
      nativeTop: 107,
      rewardHighlight: style,
      realRewardMutation: false,
    }),
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
