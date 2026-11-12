import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const dir = "output/qa/release-policy",
  fixture = JSON.parse(await readFile(dir + "/fixture.json"));
const root = resolve(process.env.AIMI_AUDIT_DIST || "apps/miniapp/dist");
const server = createServer(async (req, res) => {
  let path = new URL(req.url, "http://local").pathname;
  const file = resolve(root, "." + path);
  if (!file.startsWith(root + "/") && file !== root)
    return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.setHeader(
      "content-type",
      {
        ".js": "text/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".woff2": "font/woff2",
      }[extname(file)] || "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.setHeader("content-type", "text/html");
    res.end(await readFile(root + "/index.html"));
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const results = [];
try {
  for (const width of [320, 360, 393, 480]) {
    const page = await browser.newPage({
      viewport: { width, height: 852 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => console.error("Browser error: " + e.stack));
    const state = structuredClone(fixture.state);
    state.daily.playsUsed = 5;
    state.budget = 120;
    let rewardCalls = 0,
      releaseReward;
    let pending = false;
    await page.addInitScript(() => {
      localStorage.setItem("aimi.web-demo.session", "guest.fixture");
      localStorage.setItem("aimi.session", "a".repeat(64));
      localStorage.setItem("aimi.session.kind", "anonymous");
    });
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (
        !url.pathname.startsWith("/api/") &&
        url.hostname !== "aimi-online-api.onrender.com"
      )
        return route.continue();
      let path = url.pathname
        .replace(/^\/api/, "")
        .replace(/^\/(web-demo|demo)/, "");
      if (path === "/v1/state") return route.fulfill({ json: { data: state } });
      if (path === "/v1/content")
        return route.fulfill({ json: { data: fixture.content } });
      if (path === "/v1/models")
        return route.fulfill({ json: { data: fixture.models } });
      if (path === "/v1/social")
        return route.fulfill({ json: { data: fixture.social } });
      if (path === "/v1/optimizer/jobs" && route.request().method() === "POST")
        return route.fulfill({ json: { data: { id: fixture.job.id } } });
      if (path === "/v1/optimizer/jobs/" + fixture.job.id)
        return route.fulfill({ json: { data: fixture.job } });
      if (path.endsWith("/reward")) {
        rewardCalls++;
        if (pending) await new Promise((r) => (releaseReward = r));
        state.pendingChallengeReward = undefined;
        return route.fulfill({ json: { data: { awarded: 15, balance: 140 } } });
      }
      return route.fulfill({
        status: 404,
        json: { error: { code: "TEST_UNEXPECTED_PATH" } },
      });
    });
    const visit = async () => {
      await page.goto("http://127.0.0.1:" + server.address().port);
      await page.locator(".greeting").waitFor({ timeout: 10000 });
      await page.evaluate(() => document.fonts.ready);
    };
    const inspect = async (name) => {
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        dialogs: [...document.querySelectorAll("dialog[open]")].map((d) => {
          const r = d.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom };
        }),
        font: getComputedStyle(document.querySelector("main") || document.body)
          .fontFamily,
      }));
      assert.equal(metrics.overflow, false, name + " horizontal overflow");
      for (const d of metrics.dialogs) {
        assert.ok(
          d.x >= 0 && d.y >= 0 && d.right <= width + 0.5 && d.bottom <= 852.5,
          name + " dialog bounds",
        );
      }
      await page.screenshot({ path: `${dir}/${width}-${name}.png` });
      results.push({ width, name, ...metrics });
    };
    await visit();
    await page.getByRole("button", { name: /프롬프트 개선기/ }).click();
    await page
      .getByText("생성형 AI로 질문을 다듬고 업무를 분석해요.", { exact: false })
      .waitFor();
    await inspect("optimizer-input");
    await page
      .getByRole("textbox", { name: "개선할 질문" })
      .fill("학교 발표용 재활용 방법 세 가지를 알려줘");
    await page.getByRole("button", { name: "개선안·예시 보기" }).click();
    await page.getByText("AI가 작성한 질문이에요").waitFor();
    await inspect("optimizer-result");
    await visit();
    await page.getByRole("button", { name: /AI 모델 추천/ }).click();
    await page.locator(".ai-use-notice").waitFor();
    await inspect("recommendation-input");
    await visit();
    await page.getByRole("button", { name: "미션", exact: true }).click();
    await page.getByRole("button", { name: "챌린지 계속하기" }).click();
    await page.getByRole("button", { name: "알겠어요", exact: true }).waitFor();
    await page.getByRole("button", { name: "알겠어요", exact: true }).click();
    await page.getByText("AI로 만든 이미지", { exact: true }).first().waitFor();
    await inspect("challenge");
    await page.getByRole("button", { name: /정답 키워드 개수 보기/ }).click();
    const popup = page.locator("dialog[open]");
    await popup.waitFor();
    const buttons = popup.locator(".dialog-actions > button");
    assert.equal(await buttons.first().innerText(), "닫기");
    const boxes = await buttons.evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, height: r.height, lines: n.textContent };
      }),
    );
    assert.equal(boxes[0].y, boxes[1].y);
    assert.ok(boxes[0].x < boxes[1].x);
    await inspect("hint");
    await buttons.first().click();
    // Closing a reward dialog never submits; reopening it must remain possible.
    state.pendingChallengeReward = { id: "qa-reward", ep: 15 };
    await visit();
    await page.getByRole("dialog", { name: "성공했어요!" }).waitFor();
    await inspect("reward");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .first()
      .click();
    assert.equal(rewardCalls, 0);
    await page.getByRole("button", { name: "챌린지 보상 15 EP 받기" }).click();
    await page.getByRole("dialog", { name: "성공했어요!" }).waitFor();
    pending = true;
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "확인", exact: true })
      .click();
    await page.waitForTimeout(50);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .first()
      .click();
    assert.equal(
      await page.getByRole("dialog").count(),
      0,
      "request must not trap close",
    );
    await page.getByRole("button", { name: /나의 정원/ }).click();
    await page.getByRole("heading", { name: "나의 정원" }).waitFor();
    releaseReward();
    await page.waitForTimeout(100);
    assert.equal(rewardCalls, 1);
    await page.getByRole("heading", { name: "나의 정원" }).waitFor();
    await inspect("left-during-reward");
    await page.close();
  }
  await writeFile(
    dir + "/ui.json",
    JSON.stringify(
      {
        runtime: process.env.AIMI_AUDIT_DIST ? "toss-build" : "web-build",
        externalCalls: 0,
        reports: results,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      passed: true,
      states: results.length,
      widths: [320, 360, 393, 480],
      externalCalls: 0,
    }),
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
