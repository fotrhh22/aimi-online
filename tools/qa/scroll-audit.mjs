import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { proxyDemo } from "../../api/demo.js";
const root = resolve(process.env.AIMI_AUDIT_DIST || "apps/miniapp/dist");
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
    res.setHeader("Cache-Control", "public,max-age=3600");
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
const [sj, cj, mj, fj] = await Promise.all(
  ["state", "content", "models", "social"].map((p) =>
    fetch("https://aimi-online-api.onrender.com/demo/v1/" + p, {
      headers,
    }).then((r) => r.json()),
  ),
);
const original = sj.data,
  content = cj.data,
  model = mj.data.models[0],
  reports = [];
function attempt(ended = false) {
  return {
    id: "qa-attempt",
    date: original.daily.date,
    version: content.version,
    keywordIds: content.keywords.slice(0, 3).map((k) => k.id),
    model: "low",
    score: 37.5,
    threshold: 100,
    passed: false,
    ep: 0,
    cost: 30,
    budget: 70,
    remaining: ended ? 0 : 2,
    image: content.target,
    feedback: [],
    sentence: "Sample scene request.",
    attemptNumber: 1,
    matchedKeywordIds: content.keywords.slice(0, 2).map((k) => k.id),
    incorrectKeywordIds: [content.keywords[2].id],
    feedbackStatus: "mixed",
    ...(ended
      ? {
          reveal: {
            prompt: "Sample answer prompt with scene details. ".repeat(4),
            answerKeywordIds: content.keywords.slice(0, 8).map((k) => k.id),
            highlights: [],
            tips: [
              {
                title: "Writing tips",
                text: "Connect attributes with subjects. ".repeat(15),
                kind: "writing",
              },
              {
                title: "Model tips",
                text: "Describe the scene and composition. ".repeat(15),
                kind: "model",
                sourceLabel: "Official guide",
              },
            ],
            modelId: model.id,
          },
        }
      : {}),
  };
}
const cases = [
  ["home", "/", {}],
  ["mission-new", "/mission", { playsUsed: 0 }],
  ["mission-game", "/mission", { playsUsed: 2 }],
  ["mission-challenge", "/mission", { playsUsed: 5, attemptsUsed: 1 }],
  [
    "mission-done",
    "/mission",
    { playsUsed: 5, attemptsUsed: 3, challengeClosed: true },
  ],
  [
    "mission-success",
    "/mission",
    { playsUsed: 5, attemptsUsed: 1, success: true, challengeClosed: true },
  ],
  ["garden", "/garden", {}],
  ["garden-edit", "/garden/edit", {}],
  ["shop-items", "/shop/garden", {}],
  ["shop-characters", "/shop/characters", {}],
  ["social", "/social", {}],
  ["friend", "/friends/demo-friend", {}],
  ["account", "/account", {}],
  ["optimizer-input", "/optimizer", {}],
  ["recommendation-input", "/recommendations", {}],
  ["model-detail", "/models/" + encodeURIComponent(model.id), {}],
  ["keywords", "/challenge", {}],
  ["combination-3", "/challenge/combination", { draftCount: 3 }],
  ["combination-8", "/challenge/combination", { draftCount: 8 }],
  ["challenge-result", "/challenge/result/qa-attempt", { attemptsUsed: 1 }],
  [
    "challenge-answer",
    "/challenge/answer/qa-attempt",
    { attemptsUsed: 3, challengeClosed: true },
  ],
  ["game-result", "/results/game/qa-play", {}],
  ["game-ready", "/game", {}],
];
try {
  for (const viewport of [
    { width: 393, height: 852 },
    { width: 320, height: 740 },
  ]) {
    const context = await browser.newContext({ viewport });
    for (const [name, route, patch] of cases.filter(
      (c) =>
        !process.env.AIMI_AUDIT_SCREEN ||
        c[0] === process.env.AIMI_AUDIT_SCREEN,
    )) {
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const s = structuredClone(original);
      Object.assign(
        s.daily,
        {
          playsUsed: 2,
          best: 50,
          attemptsUsed: 0,
          success: false,
          challengeClosed: false,
          challengeVersion: content.version,
        },
        patch,
      );
      s.activePlay = null;
      s.pendingChallengeReward = null;
      s.budget = 100;
      s.challengeRemaining = 3;
      s.challengeAttempts = [];
      s.latestAttempt = null;
      if (patch.attemptsUsed) {
        const a = attempt(!!patch.challengeClosed);
        if (patch.success) {
          a.passed = true;
          a.ep = 15;
          a.rewardStatus = "claimed";
        }
        s.challengeAttempts = [a];
        s.latestAttempt = a;
        s.daily.lastAttempt = a.id;
      }
      const play = {
        id: "qa-play",
        date: s.daily.date,
        kind: "runner",
        seed: 1234,
        version: "aimi-game-v12",
        startedAt: Date.now(),
        character: s.character,
        status: "completed",
        result: {
          status: "failed",
          score: 20,
          best: 50,
          ep: 2,
          remaining: 3,
          budget: 100,
        },
      };
      await page.addInitScript(
        ({ token, date, version, ids }) => {
          localStorage.setItem("aimi.web-demo.session", token);
          sessionStorage.setItem(
            "aimi.challenge." + date + "." + version,
            JSON.stringify(ids),
          );
          sessionStorage.setItem(
            "aimi.challenge." + date + "." + version + ".intro-seen",
            "true",
          );
        },
        {
          token,
          date: s.daily.date,
          version: content.version,
          ids: content.keywords
            .slice(0, patch.draftCount ?? 3)
            .map((k) => k.id),
        },
      );
      await page.route("**/api/**", async (r) => {
        const path = new URL(r.request().url()).pathname;
        let data = {};
        if (path.endsWith("/v1/state")) data = s;
        else if (path.endsWith("/v1/content")) data = content;
        else if (path.endsWith("/v1/models")) data = mj.data;
        else if (path.endsWith("/v1/social")) data = fj.data;
        else if (path.includes("/friends/"))
          data = {
            name: "QA friend",
            character: "fox",
            todayChallengeSucceeded: true,
            challengeSuccessCount: 3,
            garden: s.garden,
          };
        else if (path.includes("/attempts/"))
          data = attempt(!!patch.challengeClosed);
        else if (path.includes("/game-plays"))
          data =
            r.request().method() === "POST"
              ? { ...play, status: "running", result: undefined }
              : play;
        else if (path.endsWith("/status"))
          data = { aiUsed: 0, aiEndsAt: "2026-11-13T14:08:51Z" };
        await r.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data }),
        });
      });
      await page.goto("http://127.0.0.1:" + port);
      await page
        .getByRole("button", { name: "\uacf5\uc9c0", exact: true })
        .waitFor();
      await page.evaluate((route) => {
        if (route === "/") return;
        const index = (history.state?.aimiNavigation?.index ?? 0) + 1;
        history.pushState(
          { aimiNavigation: { index, trail: ["/", route] } },
          "",
          route,
        );
        dispatchEvent(new PopStateEvent("popstate", { state: history.state }));
      }, route);
      if (route !== "/")
        await page
          .locator('main[data-screen="' + route + '"]:not([hidden])')
          .waitFor({ timeout: 5000 });
      await page.evaluate(() => {
        document.documentElement.dataset.aimiHost = "toss";
        document.documentElement.style.setProperty("--sdk-safe-top", "59px");
        document.documentElement.style.setProperty("--sdk-safe-bottom", "34px");
        document.querySelector(".dev-platform")?.remove();
      });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(80);
      const g = await page.evaluate(() => {
        const main = document.querySelector(".app-shell > main:not([hidden])");
        const header = document.querySelector("main:not([hidden]) > .screen-head");
        return {
          pageScroll: main.scrollHeight - main.clientHeight,
          documentScroll: document.documentElement.scrollHeight - innerHeight,
          top: main.getBoundingClientRect().top,
          headerTop: header?.getBoundingClientRect().top ?? null,
        };
      });
      reports.push({ name, route, ...viewport, ...g, errors });
      await mkdir("output/qa/scroll-audit", { recursive: true });
      await import("node:fs/promises").then((fs) =>
        fs.writeFile(
          "output/qa/scroll-audit/report.json",
          JSON.stringify(reports, null, 2),
        ),
      );
      assert.equal(g.documentScroll, 0, JSON.stringify(reports.at(-1)));
      if (
        viewport.width === 393 &&
        (name.startsWith("mission-") ||
          name.startsWith("combination-") ||
          ["home", "garden-edit", "friend"].includes(name))
      )
        assert.ok(g.pageScroll <= 1, JSON.stringify(reports.at(-1)));
      assert.ok(g.top >= 107);
      assert.deepEqual(errors, []);
      await page.evaluate(() => {
        const p = document.querySelector(".app-shell > main:not([hidden])");
        p.scrollTop = p.scrollHeight;
      });
      const after = await page.evaluate(() => ({
        doc: window.scrollY,
        header:
          document.querySelector("main:not([hidden]) > .screen-head")?.getBoundingClientRect().top ??
          null,
      }));
      assert.equal(after.doc, 0);
      const scroll = await page.evaluate(() => document.querySelector(".app-shell > main:not([hidden])").scrollTop);
      if (g.headerTop !== null) assert.ok(Math.abs(after.header - (g.headerTop - scroll)) < 1, "Title must scroll with content");
      await page.close();
    }
  }
  await mkdir("output/qa/scroll-audit", { recursive: true });
  const fs = await import("node:fs/promises");
  await fs.writeFile(
    "output/qa/scroll-audit/report.json",
    JSON.stringify(reports, null, 2),
  );
  console.log(
    JSON.stringify(
      reports.map((r) => ({
        screen: r.name,
        width: r.width,
        scroll: r.pageScroll,
      })),
    ),
  );
} finally {
  await browser.close();
  server.closeAllConnections();
  server.close();
}
