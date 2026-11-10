import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Fastify from "fastify";
import {
  AA_SCORE_FIELDS,
  publishAvailableModels,
  availabilityAllowsRecommendation,
  availabilityLabel,
  type AvailabilityPolicy,
  type ModelRecord,
} from "@aimi/contracts";
import { recommend } from "@aimi/recommender";
import {
  ModelFacts,
  displayAAProfile,
  pricePerMillion,
  featureLabels,
} from "../../miniapp/src/features/optimizer/model-facts.js";
import { FileRepository } from "../src/modules/repository.js";
import { registerPrototype } from "../src/modules/routes.js";
const read = async (path: string) =>
  JSON.parse(
    await readFile(new URL("../../../" + path, import.meta.url), "utf8"),
  );

test("published catalogue exposes exactly 156 canonical models and preserves candidate/reviewed evidence", async () => {
  const snapshot = await read("content/fixtures/models.json");
  const models = snapshot.models as ModelRecord[];
  assert.equal(models.length, 156);
  assert.equal(new Set(models.map((m) => m.canonicalId)).size, 156);
  assert.equal(models.filter((m) => m.verified).length, 10);
  assert.ok(
    models.every((m) => typeof displayAAProfile(m)?.speed === "number"),
  );
  assert.ok(
    models.every(
      (m) =>
        m.context > 0 &&
        m.maxOutput > 0 &&
        m.inputPrice >= 0 &&
        m.outputPrice >= 0,
    ),
  );
  assert.ok(
    models
      .filter((m) => !m.verified)
      .every((m) => m.intelligence === null && m.coding === null),
  );
  const app = Fastify();
  registerPrototype(app, new FileRepository(), async () => "catalog-viewer");
  try {
    const response = await app.inject({ url: "/v1/models" });
    assert.equal(response.statusCode, 200);
    const mediaSnapshot = await read("content/fixtures/models-media.json");
    const policy = await read("content/catalog/model-availability.json");
    assert.equal(
      response.json().data.models.length,
      publishAvailableModels([...models, ...mediaSnapshot.models], policy)
        .length,
    );
    for (const tier of ["Small", "Medium", "High"] as const) {
      const result = recommend(
        models,
        { taskType: "general", requiredCapabilities: [] },
        tier,
        new Date(snapshot.asOf),
      );
      assert.ok(result.models.every((m) => m.verified));
      assert.ok(result.models.length <= 3);
    }
  } finally {
    await app.close();
  }
});

test("every AA profile contains seven original scores from one row, never a mixture of reasoning settings", async () => {
  const snapshot = await read("content/fixtures/models.json"),
    aa = await read("content/fixtures/aa-public.json");
  for (const model of snapshot.models as ModelRecord[])
    for (const profile of model.aaProfiles ?? []) {
      const raw = aa.data.find((a: { id: string }) => a.id === profile.id);
      assert.ok(raw);
      assert.equal(profile.name, raw.name);
      assert.equal(
        profile.speed,
        raw.performance?.median_output_tokens_per_second ?? null,
      );
      assert.equal(Object.keys(profile.evaluations).length, 7);
      for (const { key, source } of AA_SCORE_FIELDS)
        assert.equal(profile.evaluations[key], raw.evaluations[source] ?? null);
    }
});

test("AA view renders all seven fields, preserves zero and switches entire measurement profiles", async () => {
  const snapshot = await read("content/fixtures/models.json");
  const model = snapshot.models.find(
    (m: ModelRecord) => m.aaProfiles!.length > 1,
  ) as ModelRecord;
  const profile = {
    ...displayAAProfile(model)!,
    id: "test-zero-and-null",
    name: "Measurement with 0 and missing fields",
    evaluations: Object.fromEntries(
      AA_SCORE_FIELDS.map(({ key }, i) => [key, i === 0 ? 0 : null]),
    ),
  };
  const html = renderToStaticMarkup(
    React.createElement(ModelFacts, {
      model: {
        ...model,
        aaProfiles: [profile],
        defaultAAProfileId: profile.id,
      } as ModelRecord,
    }),
  );
  for (const { label } of AA_SCORE_FIELDS) assert.ok(html.includes(label));
  assert.equal((html.match(/data-score-missing="true"/g) ?? []).length, 6);
  assert.ok(html.includes("height:0%"));
  assert.ok(html.includes("종합 성능: 0"));
  assert.ok(html.includes("표시 눈금 0–100"));
  assert.ok(!html.includes("N/A"));
  assert.ok(!html.includes("Coding Index"));
  assert.ok(!html.includes("첫 답변 토큰"));
  for (const p of model.aaProfiles!) {
    assert.equal(displayAAProfile(model, p.id)?.id, p.id);
    const rendered = renderToStaticMarkup(
      React.createElement(ModelFacts, { model, profileId: p.id }),
    );
    assert.ok(
      rendered.includes(
        p.mappingStatus === "reviewed" ? "연결을 확인한" : "검수 중",
      ),
    );
  }
  assert.equal(pricePerMillion(0), "$0");
  assert.equal(pricePerMillion(0.00000014), "$0.14");
  assert.ok(
    !featureLabels({
      ...model,
      capabilities: ["text"],
      inputModalities: ["text"],
    }).includes("이미지 이해"),
  );
});

test("catalogue refresh refuses missing identity or measurement rather than publishing an incomplete selection", async () => {
  const { applyCatalogueSelection } =
    await import("../../../tools/model-sync/catalogue-selection.mjs");
  const snapshot = await read("content/fixtures/models.json"),
    selection = await read("content/catalog/model-selection-156.json"),
    aa = await read("content/fixtures/aa-public.json"),
    mappings = await read("content/model-mappings.json");
  assert.throws(
    () =>
      applyCatalogueSelection(
        snapshot.models.slice(1),
        aa,
        selection,
        mappings,
        selection.aaAsOf,
      ),
    /IDENTITY_CHANGED/,
  );
  const changed = structuredClone(aa);
  const affected = new Set(selection.models[0].aaCandidateIds);
  for (const a of changed.data)
    if (affected.has(a.id))
      a.performance.median_output_tokens_per_second = null;
  assert.throws(
    () =>
      applyCatalogueSelection(
        snapshot.models,
        changed,
        selection,
        mappings,
        selection.aaAsOf,
      ),
    /AA_SPEED_MISSING/,
  );
  const wrongCanonical = structuredClone(snapshot.models);
  wrongCanonical[0].canonicalId = "different-model-version";
  assert.throws(
    () =>
      applyCatalogueSelection(
        wrongCanonical,
        aa,
        selection,
        mappings,
        selection.aaAsOf,
      ),
    /IDENTITY_CHANGED/,
  );
});

test("explicit product reviews replace the Medium fallback without adding models or promoting AA candidates", async () => {
  const { catalogClassifications, MODEL_GROUP_POLICY_VERSION } =
    await import("@aimi/recommender");
  const policy = await read("content/policies/model-groups-v3.json"),
    snapshot = await read("content/fixtures/models.json");
  const models = snapshot.models as ModelRecord[],
    classes = catalogClassifications(models);
  assert.equal(policy.version, MODEL_GROUP_POLICY_VERSION);
  assert.deepEqual(
    policy.models.map((r: { id: string }) => r.id).sort(),
    models.map((m) => m.id).sort(),
  );
  assert.deepEqual(
    Object.fromEntries(
      ["Small", "Medium", "High"].map((t) => [
        t,
        [...classes.values()].filter((c) => c.tier === t).length,
      ]),
    ),
    { Small: 32, Medium: 53, High: 71 },
  );
  for (const [id, tier] of [
    ["microsoft/phi-4", "Small"],
    ["z-ai/glm-4.5-air", "Small"],
    ["upstage/solar-mini4", "Small"],
    ["openai/gpt-6-luna", "Small"],
    ["upstage/solar-pro4", "Medium"],
    ["google/gemini-4-argon", "High"],
    ["cohere/command-a-plus", "High"],
    ["stepfun/step-3.5-flash", "High"],
  ])
    assert.equal(classes.get(id)?.tier, tier);
  assert.equal(classes.get("meta/muse-wonder")?.basis, "provisional");
  assert.equal(
    classes.get("nvidia/nemotron-3.5-super-vl")?.reviewStatus,
    "prior-policy-retained",
  );
  assert.equal(models.filter((m) => m.verified).length, 10);
  const altered = models.map((m) => ({
    ...m,
    inputPrice: 0,
    outputPrice: 999,
    intelligence: 99,
  }));
  assert.deepEqual(
    [...catalogClassifications(altered)].map(([id, c]) => [id, c.tier]),
    [...classes].map(([id, c]) => [id, c.tier]),
  );
  const { canonicalModelId } =
    await import("../../../packages/recommender/src/model-groups.js");
  assert.equal(canonicalModelId("openai/o3-mini:batch"), "openai/o3-mini");
  assert.equal(
    canonicalModelId("cohere/north-mini-code:free"),
    "cohere/north-mini-code",
  );
});

test("provider-source review status requires a captured primary document; unresolved sources remain explicit", async () => {
  const { createHash } = await import("node:crypto");
  const policy = await read("content/policies/model-groups-v3.json");
  for (const row of policy.models) {
    assert.ok(row.reason.length > 10);
    assert.ok(
      row.sources.some(
        (s: { kind: string }) => s.kind === "stored-openrouter-description",
      ),
    );
    if (row.reviewStatus !== "source-reviewed") continue;
    const source = row.sources.find((s: { kind: string }) =>
      s.kind.startsWith("provider-"),
    );
    assert.ok(source, row.id);
    const text = await readFile(
      new URL("../../../" + source.localFile, import.meta.url),
      "utf8",
    );
    assert.equal(
      createHash("sha256").update(text).digest("hex"),
      source.sha256,
    );
    assert.ok(source.excerpt.length > 0);
  }
  assert.equal(
    policy.models.filter(
      (r: { reviewStatus: string }) => r.reviewStatus === "needs-confirmation",
    ).length,
    5,
  );
  assert.equal(
    policy.models.filter(
      (r: { reviewStatus: string }) =>
        r.reviewStatus === "prior-policy-retained",
    ).length,
    1,
  );
});

test("AA graph uses a fixed axis and preserves missing and out-of-range raw values", async () => {
  const { aaBarHeight, AAScoreChart } =
    await import("../../miniapp/src/features/optimizer/aa-score-chart.js");
  assert.equal(aaBarHeight(null), null);
  assert.equal(aaBarHeight(Number.NaN), null);
  assert.equal(aaBarHeight(0), 0);
  assert.equal(aaBarHeight(30), 30);
  assert.equal(aaBarHeight(140), 100);
  const snapshot = await read("content/fixtures/models.json");
  const profile = structuredClone(displayAAProfile(snapshot.models[0])!);
  for (const { key } of AA_SCORE_FIELDS) profile.evaluations[key] = null;
  const empty = renderToStaticMarkup(
    React.createElement(AAScoreChart, { profile }),
  );
  assert.equal(empty, "");
  assert.equal(renderToStaticMarkup(React.createElement(AAScoreChart, {})), "");
  profile.evaluations.intelligence = 140;
  const overflow = renderToStaticMarkup(
    React.createElement(AAScoreChart, { profile }),
  );
  assert.ok(overflow.includes("height:100%"));
  assert.ok(overflow.includes("종합 성능: 140"));
});

import {
  estimateMedia,
  supportsOutput,
  comparisonRequest,
  comparisonSummary,
} from "@aimi/recommender";
import { TaskSchema } from "../src/services/llm/gemini.js";
test("full collection retains output-specific discovery, canonical media and real prices without text AA gates", async () => {
  const raw = await read("output/model-audit/multimodal/models-all.json");
  const media = (await read("content/fixtures/models-media.json"))
    .models as ModelRecord[];
  assert.equal(raw.data.length, raw.total_count);
  assert.ok(media.some((m) => m.outputModalities?.includes("image")));
  assert.ok(media.some((m) => m.outputModalities?.includes("video")));
  assert.ok(media.some((m) => m.outputModalities?.includes("speech")));
  assert.equal(new Set(media.map((m) => m.canonicalId)).size, media.length);
  assert.ok(media.every((m) => !m.id.startsWith("openrouter/") && !m.verified));
  assert.ok(media.every((m) => m.intelligence === null));
  const image = media.find(
    (m) => m.id === "black-forest-labs/flux.2-klein-4b",
  )!;
  assert.ok(supportsOutput(image, "image"));
  assert.ok(!supportsOutput(image, "text"));
  assert.equal(
    TaskSchema.safeParse({
      outputKind: "hologram",
      taskType: "general",
      requiredCapabilities: [],
      suggestedTier: "Small",
      reason: "",
      unknowns: [],
    }).success,
    false,
  );
});
test("media prices use actual image/MP and seconds, never zero text tokens or unknown output tokens", async () => {
  const media = (await read("content/fixtures/models-media.json"))
    .models as ModelRecord[];
  const flux = media.find((m) => m.id === "black-forest-labs/flux.2-klein-4b")!;
  assert.equal(estimateMedia(flux, "image").usd, null); // pixel size support is unconfirmed, not assumed
  const measuredSize = {
    ...flux,
    media: {
      ...flux.media!,
      imageEndpoints: flux.media!.imageEndpoints.map((e) => ({
        ...e,
        supported_parameters: {
          ...e.supported_parameters,
          resolution: { type: "enum", values: ["1K"] },
        },
      })),
    },
  };
  assert.ok(
    Math.abs(
      estimateMedia(measuredSize, "image").usd! - (0.014 * 1024 * 1024) / 1e6,
    ) < 1e-10,
  );
  const token = media.find((m) => m.id === "google/gemini-nano-banana-2.1")!;
  assert.equal(estimateMedia(token, "image").usd, null);
  const veo = media.find((m) => m.id === "google/veo-3.1")!;
  assert.ok(Math.abs(estimateMedia(veo, "video").usd! - 1.2) < 1e-10);
  assert.equal(estimateMedia(veo, "video", { durationSeconds: 5 }).usd, null);
  assert.ok(
    Math.abs(
      estimateMedia(veo, "video", { durationSeconds: 6, resolution: "4K" })
        .usd! - 2.4,
    ) < 1e-10,
  );
  assert.equal(estimateMedia(veo, "video", { referenceImages: 1 }).usd, null);
  assert.equal(
    estimateMedia(flux, "image", { operation: "edit", referenceImages: 0 }).usd,
    null,
  );
  assert.equal(estimateMedia(flux, "image", { referenceImages: 99 }).usd, null);
  assert.equal(estimateMedia(flux, "image", { aspectRatio: "16:9" }).usd, null);
});
test("recommendation filters output before group and sorts comparable generation costs only", async () => {
  const text = (await read("content/fixtures/models.json"))
    .models as ModelRecord[];
  const media = (await read("content/fixtures/models-media.json"))
    .models as ModelRecord[];
  const models = [...text, ...media];
  const now = new Date(media[0].asOf);
  for (const outputKind of ["image", "video"] as const)
    for (const tier of ["Small", "Medium", "High"] as const) {
      const result = recommend(
        models,
        { outputKind, taskType: "general", requiredCapabilities: ["text"] },
        tier,
        now,
      );
      assert.ok(result.models.length <= 3);
      assert.ok(
        result.models.every(
          (m) =>
            m.media && supportsOutput(m, outputKind) && m.productTier === tier,
        ),
      );
      const costs = result.models.map((m) => estimateMedia(m, outputKind).usd!);
      assert.deepEqual(
        costs,
        [...costs].sort((a, b) => a - b),
      );
      assert.ok(costs.every((x) => Number.isFinite(x) && x > 0));
    }
  const missingReference = recommend(
    models,
    {
      outputKind: "video",
      taskType: "general",
      requiredCapabilities: ["text", "image"],
    },
    "Medium",
    now,
  );
  assert.equal(missingReference.models.length, 0);
  const unknown = recommend(
    models,
    { outputKind: "embeddings", taskType: "general", requiredCapabilities: [] },
    "Medium",
    now,
  );
  assert.equal(unknown.models.length, 0);
  const stale = recommend(
    media,
    { outputKind: "image", taskType: "general", requiredCapabilities: [] },
    "Small",
    new Date(now.getTime() + 31 * 86400_000),
  );
  assert.equal(stale.models.length, 0);
  const future = recommend(
    media,
    { outputKind: "video", taskType: "general", requiredCapabilities: [] },
    "High",
    new Date(now.getTime() - 1),
  );
  assert.equal(future.models.length, 0);
  const regular = recommend(
    models,
    { outputKind: "text", taskType: "general", requiredCapabilities: [] },
    "Small",
    now,
  );
  assert.ok(regular.models.every((m) => !m.media));
});
test("generation detail UI exposes actual units/settings and never shows text AA or free zero-token prices", async () => {
  const media = (await read("content/fixtures/models-media.json"))
    .models as ModelRecord[];
  const video = media.find((m) => m.id === "google/veo-3.1")!;
  const html = renderToStaticMarkup(
    React.createElement(ModelFacts, { model: video }),
  );
  assert.ok(
    html.includes("720p") && html.includes("duration_seconds_without_audio"),
  );
  assert.ok(!html.includes("입력 100만 토큰당"));
  assert.ok(!html.includes("AA 측정 조건"));
  assert.ok(!html.includes("AA 종합"));
});

test("HTTP recommendation scopes analysis by selected output, reuses tier analysis and rejects output conflicts", async () => {
  const beforeFetch = globalThis.fetch,
    beforeKey = process.env.AIMI_GEMINI_API_KEY,
    beforeMode = process.env.AIMI_AI_MODE;
  process.env.AIMI_GEMINI_API_KEY = "synthetic-output-contract-key";
  delete process.env.AIMI_AI_MODE;
  let calls = 0;
  let mismatch = false;
  const prompts: string[] = [];
  globalThis.fetch = async (_url, options) => {
    const system = JSON.parse(String(options?.body)).systemInstruction.parts[0]
      .text as string;
    prompts.push(system);
    const selected =
      /사용자가 선택한 출력 형태는 (text|image|video)로/.exec(system)?.[1] ??
      "image";
    calls++;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    outputKind: selected,
                    outputMismatch: mismatch,
                    requiredInputModalities: ["text"],
                    taskType: "general",
                    requiredCapabilities: ["text", "image"],
                    suggestedTier: "Small",
                    reason: "합성 검사: 실제 이미지 출력",
                    unknowns: [],
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  const app = Fastify();
  registerPrototype(
    app,
    new FileRepository(),
    async () => "media-routing-contract",
  );
  app.setErrorHandler((error, _request, reply) => {
    reply
      .status(error.name === "ZodError" ? 400 : ((error as any).status ?? 500))
      .send({ error: { code: (error as any).code ?? error.name } });
  });
  const visitId = crypto.randomUUID();
  const query = (extra: Record<string, unknown> = {}) =>
    app.inject({
      method: "POST",
      url: "/v1/recommendations",
      headers: { "idempotency-key": crypto.randomUUID() },
      payload: { text: "빵집 홍보용 이미지 만들어줘.", visitId, ...extra },
    });
  try {
    const first = await query({ outputKind: "image" });
    assert.equal(first.statusCode, 200);
    const image = first.json().data;
    assert.equal(image.outputKind, "image");
    assert.deepEqual(image.task.requiredCapabilities, ["text"]);
    assert.ok(
      image.models.length > 0 &&
        image.models.every((m: ModelRecord) => supportsOutput(m, "image")),
    );
    assert.equal(image.comparison.resolution, "1K");
    const next = await query({
      outputKind: "video",
      tier: "High",
      media: { durationSeconds: 6, resolution: "720p" },
    });
    assert.equal(next.statusCode, 200);
    assert.equal(next.json().data.outputKind, "video");
    assert.ok(
      next.json().data.models.length > 0 &&
        next
          .json()
          .data.models.every(
            (m: ModelRecord) =>
              supportsOutput(m, "video") && m.productTier === "High",
          ),
    );
    assert.equal(calls, 2);
    assert.ok(prompts[0].includes("사용자가 선택한 출력 형태는 image로"));
    assert.ok(prompts[1].includes("사용자가 선택한 출력 형태는 video로"));
    const tierOnly = await query({ outputKind: "video", tier: "Small" });
    assert.equal(tierOnly.statusCode, 200);
    assert.equal(calls, 2);
    mismatch = true;
    const conflict = await query({ outputKind: "text" });
    assert.equal(conflict.statusCode, 422);
    assert.equal(conflict.json().error.code, "AI_OUTPUT_MISMATCH");
    const invalid = await query({ outputKind: "invalid-output" });
    assert.equal(invalid.statusCode, 400);
  } finally {
    globalThis.fetch = beforeFetch;
    if (beforeKey === undefined) delete process.env.AIMI_GEMINI_API_KEY;
    else process.env.AIMI_GEMINI_API_KEY = beforeKey;
    if (beforeMode === undefined) delete process.env.AIMI_AI_MODE;
    else process.env.AIMI_AI_MODE = beforeMode;
    await app.close();
  }
});

test("catalogue audit retains only the approved 45 images and removes ended, empty and inactive routes from every published list", async () => {
  const text = (await read("content/fixtures/models.json"))
    .models as ModelRecord[];
  const media = (await read("content/fixtures/models-media.json"))
    .models as ModelRecord[];
  const policy = (await read(
    "content/catalog/model-availability.json",
  )) as AvailabilityPolicy;
  const date = new Date(policy.checkedAt);
  const published = publishAvailableModels([...text, ...media], policy, date);
  const counts = (kind: string) =>
    published.filter((m) => (m.media?.kind ?? "text") === kind).length;
  assert.equal(counts("image"), 45);
  assert.equal(counts("text"), 144);
  assert.equal(counts("video"), 26);
  assert.equal(counts("audio"), 0);
  const pool = await read("content/catalog/image-candidates-45.json");
  assert.deepEqual(
    published
      .filter((m) => m.media?.kind === "image")
      .map((m) => m.id)
      .sort(),
    [...pool.ids].sort(),
  );
  for (const id of [
    "openai/gpt-image-1",
    "meta/muse-image",
    "qwen/qwen-image-3",
    "recraft/recraft-v4-vector",
    "openai/gpt-5.2-codex",
    "google/gemini-3.1-flash-lite-preview",
    "cohere/north-mini-code:free",
    "bytedance/seedance-2.0",
    "google/gemini-omni-1.2-flash",
    "runway/aleph-2",
    "google/lyria-3-pro-preview",
    "openai/gpt-audio",
  ])
    assert.ok(!published.some((m) => m.id === id), id);
  for (const tier of ["Small", "Medium", "High"] as const) {
    for (const outputKind of ["text", "image", "video"] as const) {
      const r = recommend(
        published,
        { outputKind, taskType: "general", requiredCapabilities: ["text"] },
        tier,
        date,
      );
      assert.ok(
        r.models.every((m) =>
          availabilityAllowsRecommendation(m.availability, date),
        ),
      );
      assert.ok(r.models.every((m) => !m.availability?.shutdownDate));
    }
  }
});
test("deprecation notice, empty endpoints, stale audits and new unaudited candidates fail closed without treating zero as missing", async () => {
  const policy = (await read(
    "content/catalog/model-availability.json",
  )) as AvailabilityPolicy;
  const now = new Date(policy.checkedAt);
  const retired = policy.models.find((m) => m.id === "openai/gpt-image-1")!;
  const scheduled = policy.models.find(
    (m) => m.id === "bytedance/seedance-1-5-pro",
  )!;
  const available = policy.models.find(
    (m) => m.kind === "image" && m.recommendationAllowed,
  )!;
  assert.equal(retired.status, "retired");
  assert.equal(retired.shutdownDate, "2026-10-23");
  assert.ok(scheduled.visible);
  assert.ok(!scheduled.recommendationAllowed);
  assert.ok(availabilityLabel(scheduled)?.includes("2026-11-11"));
  assert.equal(availabilityAllowsRecommendation(retired, now), false);
  assert.equal(availabilityAllowsRecommendation(scheduled, now), false);
  assert.equal(
    availabilityAllowsRecommendation(
      available,
      new Date(now.getTime() + 8 * 86400_000),
    ),
    false,
  );
  assert.equal(
    availabilityAllowsRecommendation(
      available,
      new Date(Date.parse(available.checkedAt) - 1),
    ),
    false,
  );
  assert.equal(
    availabilityAllowsRecommendation(
      { ...available, activeEndpointCount: 0 },
      now,
    ),
    false,
  );
  const unknown = publishAvailableModels(
    [{ id: "new/unknown-image", media: { kind: "image" } }],
    policy,
    now,
  );
  assert.equal(unknown.length, 0);
  const exactDate = new Date("2026-11-11T00:00:00Z");
  assert.equal(
    publishAvailableModels(
      [{ id: scheduled.id, media: { kind: "video" } }],
      policy,
      exactDate,
    ).length,
    0,
  );
});

test("only text image video are published; removed outputs return unsupported instead of text fallback", async () => {
  const source = [
    ...(await read("content/fixtures/models.json")).models,
    ...(await read("content/fixtures/models-media.json")).models,
  ] as ModelRecord[];
  const policy = (await read(
    "content/catalog/model-availability.json",
  )) as AvailabilityPolicy;
  const now = new Date(policy.checkedAt);
  const rows = publishAvailableModels(source, policy, now);
  assert.ok(
    rows.every((m) =>
      ["text", "image", "video"].includes(m.media?.kind ?? "text"),
    ),
  );
  for (const outputKind of [
    "audio",
    "speech",
    "transcription",
    "embeddings",
    "rerank",
    "decisions",
  ] as const) {
    const r = recommend(
      rows,
      { outputKind, taskType: "general", requiredCapabilities: ["text"] },
      "Small",
      now,
    );
    assert.equal(r.status, "UNSUPPORTED_OUTPUT");
    assert.equal(r.models.length, 0);
  }
});

test("media comparison defaults stay compact and edits assume one reference only when unspecified", () => {
  assert.equal(comparisonSummary("video"), "새로 생성 · 6초 · 720p · 16:9");
  assert.equal(
    comparisonSummary("image", { resolution: "2K", aspectRatio: "9:16" }),
    "새로 생성 · 2K · 9:16",
  );
  assert.equal(
    comparisonRequest("image", { operation: "edit" }).referenceImages,
    1,
  );
  assert.equal(
    comparisonRequest("image", { operation: "edit", referenceImages: 0 })
      .referenceImages,
    0,
  );
  assert.equal(
    comparisonSummary("image", { operation: "edit" }),
    "수정·편집 · 1K · 1:1 · 참조 1장",
  );
  assert.equal(
    comparisonSummary("video", {
      durationSeconds: 10,
      generateAudio: true,
      referenceImages: 2,
    }),
    "새로 생성 · 10초 · 720p · 16:9 · 참조 2장 · 오디오 포함",
  );
});
