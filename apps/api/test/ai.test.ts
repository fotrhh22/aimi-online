import test from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { registerPrototype } from "../src/modules/routes.js";
import { FileRepository, newState } from "../src/modules/repository.js";
test("AI job idempotency, structured validation, and tier switch analysis reuse", async () => {
  const dir = await mkdtemp(join(tmpdir(), "aimi-ai-")),
    repo = new FileRepository(join(dir, "state.json")),
    app = Fastify(),
    fetchBefore = globalThis.fetch,
    keyBefore = process.env.AIMI_GEMINI_API_KEY,
    modeBefore = process.env.AIMI_AI_MODE;
  let calls = 0;
  process.env.AIMI_GEMINI_API_KEY = "synthetic-test-key";
  delete process.env.AIMI_AI_MODE;
  const output = {
    improvedText: "재활용 방법 3가지를 알려줘.",
    extendedExample: "재활용 방법 3가지를 항목별로 알려줘.",
    addedAssumptions: ["항목별 형식"],
    changes: ["문장 정리"],
    tips: [
      { quote: "항목별로", tip: "출력 형식을 정해요." },
      { quote: "본문에 없는 구절", tip: "이 팁은 제외해야 해요." },
    ],
    taskProfile: {
      outputKind: "text",
      requiredInputModalities: ["text"],
      taskType: "general",
      requiredCapabilities: ["text"],
      suggestedTier: "Small",
      reason: "간단한 작성 업무예요.",
      unknowns: [],
    },
  };
  globalThis.fetch = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, 10));
    return new Response(
      JSON.stringify({
        candidates: [
          { content: { parts: [{ text: JSON.stringify(output) }] } },
        ],
      }),
      { status: 200 },
    );
  };
  registerPrototype(app, repo, async () => "test-user");
  try {
    const request = {
      method: "POST" as const,
      url: "/v1/optimizer/jobs",
      headers: { "idempotency-key": "optimizer-once" },
      payload: { text: "재활용 방법 3개" },
    };
    const result = await Promise.all([
      app.inject(request),
      app.inject(request),
    ]);
    assert.equal(result[0].json().data.id, result[1].json().data.id);
    const id = result[0].json().data.id;
    let job;
    for (let i = 0; i < 40; i++) {
      job = (await app.inject({ url: "/v1/optimizer/jobs/" + id })).json().data;
      if (job.status !== "running") break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.equal(job.status, "succeeded");
    assert.equal(job.result.tips.length, 1);
    assert.equal(job.result.tips[0].quote, "항목별로");
    assert.equal(calls, 1);
    for (const tier of ["Small", "High"]) {
      const r = await app.inject({
        method: "POST",
        url: "/v1/recommendations",
        headers: { "idempotency-key": "recommend-" + tier },
        payload: { text: "재활용 방법 3개", tier },
      });
      assert.equal(r.statusCode, 200);
      assert.equal(r.json().data.tier, tier);
    }
    assert.equal(calls, 1);
    const fresh = await app.inject({
      ...request,
      headers: { "idempotency-key": "new-visit" },
      payload: { text: "재활용 방법 3개", visitId: crypto.randomUUID() },
    });
    assert.notEqual(fresh.json().data.id, id);
    for (let n = 0; n < 40; n++) {
      const j = (
        await app.inject({ url: "/v1/optimizer/jobs/" + fresh.json().data.id })
      ).json().data;
      if (j.status !== "running") break;
      await new Promise((r) => setTimeout(r, 10));
    }
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = fetchBefore;
    if (keyBefore === undefined) delete process.env.AIMI_GEMINI_API_KEY;
    else process.env.AIMI_GEMINI_API_KEY = keyBefore;
    if (modeBefore === undefined) delete process.env.AIMI_AI_MODE;
    else process.env.AIMI_AI_MODE = modeBefore;
    await app.close();
    await rm(dir, { recursive: true, force: true });
  }
});
import { preserveUserKey } from "../src/services/toss/auth.js";
test("Toss int64 identity is preserved without numeric rounding", () => {
  const parsed = JSON.parse(
    preserveUserKey('{"userKey":9223372036854775807,"referrer":"UNLINK"}'),
  );
  assert.equal(parsed.userKey, "9223372036854775807");
});

import { validatePromptRewrite } from "../src/services/llm/gemini.js";
test("optimizer rejects answers, invented quantities and undisclosed expansion", () => {
  const valid = {
    improvedText: "공부를 더 잘할 수 있는 방법을 알려줘.",
    extendedExample: "[학습 목표]를 기준으로 공부 방법과 이유를 설명해줘.",
    addedAssumptions: ["학습 목표와 이유 설명을 제안했어요."],
  };
  assert.doesNotThrow(() => validatePromptRewrite("공부 잘하는 법", valid));
  assert.throws(
    () =>
      validatePromptRewrite("공부 잘하는 법", {
        ...valid,
        extendedExample: "목표를 세분화합니다. 25분 집중 후 5분 휴식합니다.",
      }),
    /AI_NOT_A_PROMPT/,
  );
  assert.throws(
    () =>
      validatePromptRewrite("공부 잘하는 법", {
        ...valid,
        improvedText: "공부 방법 5가지를 알려줘.",
      }),
    /AI_INTENT_CHANGED/,
  );
  assert.throws(
    () =>
      validatePromptRewrite("공부 잘하는 법", {
        ...valid,
        addedAssumptions: [],
      }),
    /AI_UNDISCLOSED_ASSUMPTIONS/,
  );
  assert.throws(
    () =>
      validatePromptRewrite("방법 3개", {
        improvedText: "방법 3개를 알려줘.",
        extendedExample: "방법을 자세히 설명해줘.",
        addedAssumptions: ["자세한 설명"],
      }),
    /AI_INTENT_CHANGED/,
  );
});
test("default development state resets between server instances and transactions remain atomic", async () => {
  const first = new FileRepository();
  await first.transaction(["user"], (s) => {
    s.user.balance = 900;
    s.user.inventory.push("bench");
    s.user.claims.today = ["attendance"];
  });
  assert.equal((await first.read("user")).balance, 900);
  await assert.rejects(
    first.transaction(["user"], (s) => {
      s.user.balance = 1;
      throw new Error("rollback");
    }),
  );
  assert.equal((await first.read("user")).balance, 900);
  const restarted = new FileRepository(),
    fresh = await restarted.read("user");
  assert.equal(fresh.balance, 125);
  assert.ok(!fresh.inventory.includes("bench"));
  assert.deepEqual(fresh.claims, {});
  assert.notEqual(fresh.authEpoch, (await first.read("user")).authEpoch);
});

import { seoulDate } from "@aimi/contracts";
import { ApiError } from "../src/db.js";
import { reserveUserAI, releaseUserAI } from "../src/services/llm/usage.js";
test("daily optimizer and analysis quotas are independent; retries and cached tier changes do not charge", async () => {
  const previous = Object.fromEntries(
    ["AIMI_AI_MODE", "OPTIMIZER_DAILY_LIMIT", "RECOMMENDATION_DAILY_LIMIT"].map(
      (k) => [k, process.env[k]],
    ),
  );
  process.env.AIMI_AI_MODE = "fixture";
  process.env.OPTIMIZER_DAILY_LIMIT = "2";
  process.env.RECOMMENDATION_DAILY_LIMIT = "3";
  const repo = new FileRepository(),
    app = Fastify(),
    date = seoulDate();
  app.setErrorHandler((error, _req, reply) =>
    reply.code(error instanceof ApiError ? error.status : 500).send({
      error: {
        code: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
      },
    }),
  );
  registerPrototype(app, repo, async (r) => String(r.headers["x-test-user"]));
  const optimizer = (uid: string) => ({
    method: "POST" as const,
    url: "/v1/optimizer/jobs",
    headers: { "x-test-user": uid, "idempotency-key": crypto.randomUUID() },
    payload: { text: "질문을 요약해줘", visitId: crypto.randomUUID() },
  });
  const analysis = (uid: string) => ({
    method: "POST" as const,
    url: "/v1/recommendations",
    headers: { "x-test-user": uid, "idempotency-key": crypto.randomUUID() },
    payload: { text: "질문을 요약해줘", visitId: crypto.randomUUID() },
  });
  async function finish(uid: string, id: string) {
    for (let i = 0; i < 100; i++) {
      const response = await app.inject({
        url: "/v1/optimizer/jobs/" + id,
        headers: { "x-test-user": uid },
      });
      if (response.json().data.status !== "running") {
        assert.equal(response.json().data.status, "succeeded");
        return;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    assert.fail("optimizer job did not finish");
  }
  try {
    for (const [uid, recommendFirst] of [
      ["recommend-first", true],
      ["optimizer-first", false],
    ] as const) {
      let lastAnalysis: ReturnType<typeof analysis> | undefined;
      async function fillAnalysis() {
        for (let n = 0; n < 3; n++) {
          lastAnalysis = analysis(uid);
          assert.equal((await app.inject(lastAnalysis)).statusCode, 200);
        }
        const denied = await app.inject(analysis(uid));
        assert.equal(denied.statusCode, 429);
        assert.equal(denied.json().error.code, "AI_DAILY_LIMIT");
      }
      async function fillOptimizer() {
        for (let n = 0; n < 2; n++) {
          const request = optimizer(uid);
          const concurrent = await Promise.all([
            app.inject(request),
            app.inject(request),
          ]);
          assert.ok(concurrent.every((r) => r.statusCode === 200));
          assert.equal(
            concurrent[0].json().data.id,
            concurrent[1].json().data.id,
          );
          await finish(uid, concurrent[0].json().data.id);
          assert.equal(
            (await app.inject(request)).json().data.id,
            concurrent[0].json().data.id,
          );
        }
        const denied = await app.inject(optimizer(uid));
        assert.equal(denied.statusCode, 429);
        assert.equal(denied.json().error.code, "AI_DAILY_LIMIT");
      }
      if (recommendFirst) {
        await fillAnalysis();
        await fillOptimizer();
      } else {
        await fillOptimizer();
        await fillAnalysis();
      }
      const state = await repo.read(uid);
      assert.deepEqual(state.aiUsage?.[date], { optimizer: 2, analysis: 3 });
      for (const tier of ["Small", "Medium", "High"] as const) {
        const request = {
          ...lastAnalysis!,
          headers: {
            "x-test-user": uid,
            "idempotency-key": crypto.randomUUID(),
          },
          payload: { ...lastAnalysis!.payload, tier },
        };
        assert.equal((await app.inject(request)).statusCode, 200);
      }
      assert.equal((await app.inject(lastAnalysis!)).statusCode, 200);
      assert.deepEqual((await repo.read(uid)).aiUsage?.[date], {
        optimizer: 2,
        analysis: 3,
      });
    }
    assert.equal(
      (await repo.existing("__ai_usage__"))?.claims[date].length,
      10,
    );
  } finally {
    await app.close();
    for (const [key, value] of Object.entries(previous))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
test("legacy AI usage migrates by feature without resetting existing limits, and dates stay independent", () => {
  const s = newState("legacy-quota", true),
    date = "2026-11-08";
  delete s.aiUsage;
  s.claims[date] = ["attendance", "tip", "analysis", "analysis"];
  for (let n = 0; n < 5; n++)
    s.jobs[String(n)] = {
      id: String(n),
      date,
      textHash: String(n),
      createdAt: Date.now(),
      status: "failed",
    };
  reserveUserAI(s, date, "optimizer", 4);
  assert.deepEqual(s.aiUsage?.[date], { optimizer: 4, analysis: 2 });
  assert.throws(() => reserveUserAI(s, date, "optimizer", 4), /AI_DAILY_LIMIT/);
  reserveUserAI(s, date, "analysis", 3);
  assert.throws(() => reserveUserAI(s, date, "analysis", 3), /AI_DAILY_LIMIT/);
  reserveUserAI(s, "2026-11-09", "optimizer", 4);
  assert.deepEqual(s.aiUsage?.["2026-11-09"], { optimizer: 1, analysis: 0 });
  assert.deepEqual(s.aiUsage?.[date], { optimizer: 4, analysis: 3 });
});

test("recommendation uses task-only schema, keeps all three suggested tiers, and reuses analysis on manual tier change", async () => {
  const repo = new FileRepository(),
    app = Fastify();
  const oldFetch = globalThis.fetch,
    oldKey = process.env.AIMI_GEMINI_API_KEY,
    oldMode = process.env.AIMI_AI_MODE;
  process.env.AIMI_GEMINI_API_KEY = "synthetic-routing-key";
  delete process.env.AIMI_AI_MODE;
  const examples = [
    { text: "다음 한 문장을 영어로 번역해줘: 안녕하세요.", tier: "Small" },
    { text: "협업 도구를 권한과 문서 편집 기준으로 비교해줘.", tier: "Medium" },
    { text: "네트워크 분할에서 결제 원장의 불변식을 증명해줘.", tier: "High" },
  ] as const;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const properties = body.generationConfig.responseJsonSchema.properties;
    assert.ok(properties.suggestedTier);
    assert.ok(!properties.improvedText);
    const text = JSON.parse(body.contents[0].parts[0].text).userText;
    const example = examples.find((e) => e.text === text)!;
    assert.ok(example);
    const task = {
      outputKind: "text",
      requiredInputModalities: ["text"],
      taskType: "general",
      requiredCapabilities: ["text"],
      suggestedTier: example.tier,
      taskSummary: "입력한 업무의 핵심 요약이에요.",
      reason: "합성 검사에서 요청 조건을 기준으로 분류했어요.",
      unknowns: [],
    };
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(task) }] } }],
      }),
      { status: 200 },
    );
  };
  registerPrototype(app, repo, async () => "task-only-routing");
  const visitId = crypto.randomUUID();
  const request = (text: string, tier?: string) => ({
    method: "POST" as const,
    url: "/v1/recommendations",
    headers: { "idempotency-key": crypto.randomUUID() },
    payload: { text, visitId, ...(tier ? { tier } : {}) },
  });
  try {
    for (const example of examples) {
      const response = await app.inject(request(example.text));
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().data.tier, example.tier);
      assert.equal(response.json().data.task.suggestedTier, example.tier);
      assert.equal(
        response.json().data.task.taskSummary,
        "입력한 업무의 핵심 요약이에요.",
      );
      assert.equal(response.json().data.analysisVersion, "task-profile-v7");
    }
    assert.equal(calls, 3);
    const manual = await app.inject(request(examples[0].text, "Medium"));
    assert.equal(manual.json().data.tier, "Medium");
    assert.equal(manual.json().data.task.suggestedTier, "Small");
    assert.equal(calls, 3);
    const state = await repo.read("task-only-routing");
    assert.deepEqual(state.aiUsage?.[seoulDate()], {
      optimizer: 0,
      analysis: 3,
    });
    assert.ok(
      Object.values(state.jobs).every((job) => job.taskAnalysis && !job.result),
    );
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.AIMI_GEMINI_API_KEY;
    else process.env.AIMI_GEMINI_API_KEY = oldKey;
    if (oldMode === undefined) delete process.env.AIMI_AI_MODE;
    else process.env.AIMI_AI_MODE = oldMode;
    await app.close();
  }
});

test("runtime analysis rejects invalid tiers, unknown capabilities and invented model fields", async () => {
  const { Gemini } = await import("../src/services/llm/gemini.js");
  const originalFetch = globalThis.fetch,
    originalKey = process.env.AIMI_GEMINI_API_KEY;
  process.env.AIMI_GEMINI_API_KEY = "synthetic-schema-key";
  const valid = {
    outputKind: "text",
    requiredInputModalities: ["text"],
    taskType: "general",
    requiredCapabilities: ["text"],
    suggestedTier: "Small",
    reason: "합성 검사",
    unknowns: [],
  };
  try {
    for (const invalid of [
      { ...valid, outputKind: undefined },
      { ...valid, requiredInputModalities: undefined },
      { ...valid, suggestedTier: "Ultra" },
      { ...valid, requiredCapabilities: ["unlimited_web"] },
      { ...valid, modelName: "invented-model" },
    ]) {
      globalThis.fetch = async () =>
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify(invalid) }] } },
            ],
          }),
          { status: 200 },
        );
      await assert.rejects(
        () => new Gemini(false).analyze("합성 요청"),
        (error: unknown) =>
          error instanceof ApiError && error.code === "AI_INVALID_OUTPUT",
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.AIMI_GEMINI_API_KEY;
    else process.env.AIMI_GEMINI_API_KEY = originalKey;
  }
});

test("failed AI reservations refund once on their original date and recover historic invalid-tip charges", () => {
  const s = newState("refund-user", true),
    date = "2026-11-11";
  s.aiUsage = { [date]: { optimizer: 5, analysis: 2 } };
  s.jobs.oldTip = {
    id: "oldTip",
    date,
    createdAt: Date.now(),
    textHash: "old",
    status: "failed",
    error: "AI_INVALID_TIP",
  };
  reserveUserAI(s, date, "optimizer", 5);
  assert.equal(s.aiUsage[date].optimizer, 5); // Four successful/reserved + this reservation.
  assert.equal(s.jobs.oldTip.quotaRefunded, true);
  releaseUserAI(s, s.jobs.oldTip);
  assert.equal(s.aiUsage[date].optimizer, 5);
  const failure = {
    id: "analysis-error",
    date,
    createdAt: Date.now(),
    textHash: "x",
    status: "failed" as const,
    quotaFeature: "analysis" as const,
  };
  releaseUserAI(s, failure);
  releaseUserAI(s, failure);
  assert.equal(s.aiUsage[date].analysis, 1);
  reserveUserAI(s, "2026-11-12", "optimizer", 5);
  assert.equal(s.aiUsage[date].analysis, 1);
  assert.equal(s.aiUsage["2026-11-12"].optimizer, 1);
});

test("five provider failures do not exhaust optimizer or recommendation allowance", async () => {
  const saved = Object.fromEntries(
    [
      "AIMI_GEMINI_API_KEY",
      "AIMI_AI_MODE",
      "OPTIMIZER_DAILY_LIMIT",
      "RECOMMENDATION_DAILY_LIMIT",
    ].map((k) => [k, process.env[k]]),
  );
  const oldFetch = globalThis.fetch;
  process.env.AIMI_GEMINI_API_KEY = "synthetic-refund-key";
  delete process.env.AIMI_AI_MODE;
  process.env.OPTIMIZER_DAILY_LIMIT = "1";
  process.env.RECOMMENDATION_DAILY_LIMIT = "1";
  globalThis.fetch = async () =>
    new Response("provider unavailable", { status: 503 });
  const repo = new FileRepository(),
    app = Fastify(),
    uid = "refund-http";
  app.setErrorHandler((err, _req, reply) =>
    reply
      .code(err instanceof ApiError ? err.status : 500)
      .send({ error: { code: err instanceof ApiError ? err.code : "ERROR" } }),
  );
  registerPrototype(app, repo, async () => uid);
  const submit = (url: string) =>
    app.inject({
      method: "POST",
      url,
      headers: { "idempotency-key": crypto.randomUUID() },
      payload: { text: "안내문을 요약해줘", visitId: crypto.randomUUID() },
    });
  try {
    for (let n = 0; n < 5; n++) {
      const response = await submit("/v1/optimizer/jobs");
      assert.equal(response.statusCode, 200);
      const id = response.json().data.id;
      let done = false;
      for (let poll = 0; poll < 100; poll++) {
        const job = (
          await app.inject({ url: "/v1/optimizer/jobs/" + id })
        ).json().data;
        if (job.status === "failed") {
          done = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 5));
      }
      assert.ok(done);
      assert.equal((await repo.read(uid)).aiUsage?.[seoulDate()].optimizer, 0);
      assert.equal((await submit("/v1/recommendations")).statusCode, 503);
      assert.equal((await repo.read(uid)).aiUsage?.[seoulDate()].analysis, 0);
    }
  } finally {
    globalThis.fetch = oldFetch;
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await app.close();
  }
});

test("optimizer treats Korean count words and digits as equivalent without accepting changed quantities", () => {
  const result = {
    improvedText: "재활용 방법 3가지를 추천해줘.",
    extendedExample: "재활용 방법 세 가지를 준비물과 함께 추천해줘.",
    addedAssumptions: ["준비물 안내"],
  };
  assert.doesNotThrow(() =>
    validatePromptRewrite("재활용 방법 세 가지 추천해줘", result),
  );
  assert.throws(
    () => validatePromptRewrite("재활용 방법 두 가지 추천해줘", result),
    /AI_INTENT_CHANGED/,
  );
  assert.throws(
    () =>
      validatePromptRewrite("재활용 방법 3가지 추천해줘", {
        ...result,
        extendedExample: "재활용 방법 30가지를 추천해줘.",
      }),
    /AI_INTENT_CHANGED/,
  );
});
