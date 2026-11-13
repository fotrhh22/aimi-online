/** Reproduce the explicit human-readable review table and fixed runtime group policy. No model inference. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("output/model-audit", { recursive: true });
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const snapshot = await read("content/fixtures/models.json");
const selection = await read("content/catalog/model-selection-156.json");
const decisions = await read("data/model-sources/group-review-decisions.json");
const before = await read(
  "data/model-sources/group-classification-before.json",
);
const sourceIndex = await read("data/model-sources/group-sources/index.json");
const familyIndex = await read(
  "data/model-sources/group-sources/families.json",
);
const supplemental = await read(
  "data/model-sources/group-sources/supplemental.json",
).catch(() => ({ sources: [] }));
const canonical = (id) =>
  id.replace(/:(free|batch|extended|nitro|exacto)$/, "").replace(/-batch$/, "");
const plain = (t) =>
  t
    .replace(/^---[\s\S]*?---/, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*/g, "")
    .replace(/[ \t]+/g, " ");
const familyByKey = new Map(
  [...familyIndex.sources, ...supplemental.sources].map((s) => [s.key, s]),
);
const familyKeys = (m) => {
  const p = m.id.split("/")[0];
  if (p === "openai") return m.id.includes("gpt-4o") ? ["gpt4o-base"] : [];
  if (p === "anthropic") return ["claude-overview", "claude-lifecycle"];
  if (p === "google")
    return m.id.includes("argon")
      ? ["gemini-argon"]
      : m.id.includes("gemma")
        ? ["gemma-4"]
        : m.id.includes("flash-lite")
          ? ["gemini-flash-lite", "gemini-overview"]
          : ["gemini-overview"];
  if (p === "mistralai")
    return m.id.includes("large")
      ? ["mistral-large", "mistral-overview"]
      : ["mistral-overview"];
  if (p === "upstage")
    return [m.id.includes("mini") ? "solar-mini" : "solar-pro"];
  if (p === "cohere")
    return [m.id.includes("mini") ? "cohere-north" : "cohere-overview"];
  if (p === "qwen") return ["qwen-overview"];
  if (p === "z-ai") return ["zai-air"];
  if (p === "meta-llama") return ["meta-llama"];
  if (p === "meta") return ["meta-research", "meta-muse"];
  if (p === "x-ai") return [m.id.split("/")[1]];
  if (p === "nvidia") return ["nvidia-super-vl"];
  return [];
};
const familyPosition = {
  openai: {
    Small: "고빈도·효율 지향의 경량 제품군으로 분류했어요.",
    Medium:
      "제작사가 효율과 처리 능력의 균형을 지향하는 제품으로 소개해 균형형으로 분류했어요.",
    High: "해당 세대의 전체 기능·상위 추론 제품군으로 분류했어요. 현재 성능 순위를 뜻하지 않아요.",
  },
  anthropic: {
    Small: "Haiku 계열의 고빈도·낮은 지연 지향을 반영한 경량형이에요.",
    Medium: "Sonnet 계열의 속도와 처리 능력 균형 지향을 반영했어요.",
    High: "Opus·Fable 계열의 복잡한 추론·장기 작업 지향을 반영한 상위형이에요.",
  },
  google: {
    Small: "Flash-Lite의 경량·고빈도 처리 지향을 반영했어요.",
    Medium:
      "Flash·Gemma의 효율과 범용 처리 균형을 반영했어요. 작은 활성 파라미터만으로 경량형이라 단정하지 않아요.",
    High: "Argon·Pro의 복잡한 문제 해결 지향을 반영한 상위 제품군이에요.",
  },
  mistralai: {
    Small: "Mistral Small의 낮은 지연·효율 지향을 반영했어요.",
    Medium: "Mistral Medium의 범용·기업 작업 균형 지향을 반영했어요.",
    High: "Mistral Large의 상위 범용 멀티모달 제품 포지션을 반영했어요.",
  },
};
const individualReasons = {
  "upstage/solar-mini4":
    "제작사가 소형·효율 지향 제품으로 소개해 경량형으로 분류했어요.",
  "upstage/solar-pro4":
    "업무용 범용 처리와 실행 효율을 함께 지향해 균형형으로 분류했어요. Pro라는 이름만으로 상위형에 넣지 않았어요.",
  "microsoft/phi-4":
    "제작사가 Small Language Model로 소개한 제품이에요. 추론 기능이 있어도 경량 제품군은 유지해요.",
  "z-ai/glm-4.5-air":
    "제작사가 경량 변형으로 명시한 Air 제품군이에요. 총 파라미터 수만으로 등급을 정하지 않았어요.",
  "z-ai/glm-4.7-flash":
    "제작사가 경량 배포용 선택지로 소개한 모델이에요. Flash라는 이름이 아닌 배포 목적을 확인했어요.",
  "inclusionai/ling-3.0-tiny":
    "응답성과 작은 실행 규모를 지향하는 Tiny 제품 포지션을 반영했어요.",
  "inclusionai/ling-3.0-flash":
    "제작사가 이전 대형 제품 대비 실행 효율·운영 배포를 강조한 제품으로 소개해 경량형으로 판단했어요.",
  "inclusionai/ling-3.1-flash":
    "범용 추론과 실행 효율을 함께 지향하는 제품으로 보아 균형형으로 판단했어요.",
  "cohere/north-mini-code:free":
    "제작사가 로컬 실행 가능한 작은 활성 규모의 코드 모델로 소개해 경량형으로 분류했어요. 무료 여부는 기준이 아니에요.",
  "cohere/command-a-plus":
    "Command A 계열의 상위 기업용 범용·추론 제품 포지션을 반영해 상위형으로 재검토했어요.",
  "cohere/command-a":
    "해당 세대의 대표 범용·기업용 Command 제품군으로 보아 상위형으로 분류했어요.",
  "rekaai/reka-flash-3":
    "제작사가 작은 모델로 설명한 실행 효율 지향 제품이에요.",
  "qwen/qwen3.5-9b":
    "동일 계열의 소형 밀집 구조와 효율 지향 설계를 함께 검토해 경량형으로 판단했어요. AIMI의 제품군 해석이에요.",
  "openai/gpt-oss-20b":
    "제작사가 낮은 지연과 로컬 실행을 지향하는 작은 공개 모델로 소개한 점을 반영했어요.",
  "openai/gpt-oss-120b":
    "공개 모델의 범용 추론·자체 배포 포지션을 반영한 균형형이에요. 큰 총 파라미터 수만으로 상위형에 넣지 않았어요.",
  "nvidia/nemotron-3.5-lightning":
    "높은 처리량·작은 실행 규모를 지향하는 Lightning 제품군으로 분류했어요.",
  "nvidia/nemotron-3.5-super-vl":
    "기존 정책의 균형형 포지션을 유지했어요. 제작사 문서의 추가 접근·근거 보강이 필요해요.",
  "nvidia/nemotron-3-super-120b-a12b":
    "복합 에이전트 처리와 실행 효율을 함께 지향하는 Super 제품군이에요.",
  "nvidia/nemotron-3-ultra-550b-a55b":
    "Ultra의 상위 추론·오케스트레이션 포지션을 반영했어요.",
  "ibm-granite/granite-4.2-8b":
    "소형 밀집 구조와 실용적인 기업·에이전트 배포 포지션을 함께 검토해 경량형으로 판단했어요.",
  "thinkingmachines/inkling-small":
    "제작사가 더 작고 효율적인 제품 변형으로 소개한 점을 반영했어요.",
  "thinkingmachines/inkling":
    "범용 멀티모달·개발자 활용 범위를 확인해 균형형으로 판단했어요. 큰 MoE 총 규모만으로 상위형에 넣지 않았어요.",
  "tencent/hy3":
    "범용 추론·에이전트 처리 포지션을 바탕으로 균형형으로 판단했어요. 상위 제품군이라는 단정은 보류했어요.",
  "meta-llama/llama-4-maverick":
    "Scout 대비 상위 범용 멀티모달 제품 포지션을 반영했어요.",
  "meta-llama/llama-4-scout":
    "범용 멀티모달 처리와 실행 효율 지향을 반영한 균형형이에요.",
  "stepfun/step-5-preview":
    "제작사의 대표 상위 에이전트 제품 포지션을 반영했어요.",
  "stepfun/step-3.5-flash":
    "제작사가 가장 강력한 공개 기반 모델·상위 추론용으로 소개해 상위형으로 판단했어요. Flash라고 경량형으로 처리하지 않았어요.",
  "stepfun/step-3.7-flash":
    "효율 지향 멀티모달 작업용 제품으로 보아 균형형으로 판단했어요.",
};
function reason(m, tier) {
  if (individualReasons[m.id]) return individualReasons[m.id];
  const p = m.id.split("/")[0];
  if (familyPosition[p]) return familyPosition[p][tier];
  if (p === "qwen")
    return tier === "High"
      ? "Max 또는 이에 대응하는 공개 상위 제품 포지션을 확인해 분류했어요."
      : "범용·특화 처리와 실행 효율의 균형을 고려했어요. 공개 모델의 크기나 추론 설정만으로 상위형에 넣지 않았어요.";
  if (p === "deepseek")
    return tier === "High"
      ? "전체 기능·상위 추론용 Pro 및 해당 세대의 대표 V3 제품군 포지션을 반영했어요."
      : "V4 Flash의 범용 처리·추론과 실행 효율 지향을 함께 고려한 균형형이에요.";
  if (p === "moonshotai")
    return "해당 세대 Kimi의 대형 범용 추론·장기 에이전트 제품 포지션을 반영했어요.";
  if (p === "minimax")
    return tier === "High"
      ? "대규모 복합 생산성·에이전트 작업을 지향하는 기반 모델 포지션을 반영했어요."
      : "M3.1 Flash의 복합 작업과 실행 효율 지향을 함께 검토한 균형형 판단이에요.";
  if (p === "xiaomi")
    return tier === "High"
      ? "Pro의 상위 범용·복합 작업용 제품 포지션을 반영했어요."
      : "Flash의 범용 처리와 실행 효율을 고려한 균형형 판단이에요.";
  if (p === "meta")
    return "Muse의 상위 멀티모달 추론·장기 작업 포지션을 바탕으로 한 제안이에요. 버전별 제작사 근거 보강이 필요해요.";
  if (p === "z-ai")
    return tier === "High"
      ? "해당 세대의 대표 대형 추론·장기 작업 제품군을 반영했어요."
      : "특화 비전 처리 또는 효율 지향 변형으로 보아 균형형으로 판단했어요.";
  if (p === "x-ai")
    return "해당 세대 Grok의 대표 범용 추론·코드 제품 포지션을 반영했어요. 추론 강도 High와는 달라요.";
  throw Error("Missing individual rationale: " + m.id);
}
const decisionsById = new Map();
for (const [tier, ids] of Object.entries(decisions))
  for (const id of ids) {
    if (decisionsById.has(id)) throw Error("Duplicate decision " + id);
    decisionsById.set(id, tier);
  }
if (
  decisionsById.size !== snapshot.models.length ||
  snapshot.models.length !== 156
)
  throw Error("Incomplete review table");
const rows = [];
for (const m of snapshot.models) {
  const tier = decisionsById.get(m.id);
  if (!tier) throw Error("Unreviewed " + m.id);
  const primaryCandidates = [
    ...supplemental.sources.filter((s) => s.id === m.id),
    sourceIndex.sources.find((s) => s.id === m.id),
    ...familyKeys(m).map((k) => familyByKey.get(k)),
  ].filter((s) => s?.status === 200 && s.file);
  const sources = [];
  for (const source of primaryCandidates) {
    const text = await readFile(
      "data/model-sources/group-sources/" + source.file,
      "utf8",
    );
    const clean = plain(text);
    if (clean.trim().length < 400) continue;
    const target = m.name.toLowerCase().replace(/\s*\((free|batch)\)/g, "");
    const paragraphs = clean
      .split(/(?<=[.!?])\s+|\n\s*\n/)
      .map((t) => t.trim())
      .filter((t) => t.length > 40 && t.length < 2200);
    const semantic =
      /compact|lightweight|flagship|frontier|balance|capable|general-purpose|efficien|local hardware|smaller model|fast model/i;
    const normalize = (v) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
    const useful =
      paragraphs.find(
        (t) => normalize(t).includes(normalize(target)) && semantic.test(t),
      ) ??
      paragraphs.find((t) => semantic.test(t)) ??
      paragraphs.find((t) => /model|reason|work/i.test(t));
    if (!useful) continue;
    sources.push({
      kind: source.id ? "provider-model-document" : "provider-family-document",
      url: source.url
        .replace(/\/raw\/main\/README.md$/, "")
        .replace(/\.md$/, ""),
      readAt: "2026-11-10",
      localFile: "data/model-sources/group-sources/" + source.file,
      sha256: createHash("sha256").update(text).digest("hex"),
      excerpt: useful.split(/\s+/).slice(0, 22).join(" "),
    });
  }
  const prior = before.find((x) => x.id === m.id);
  // Mark unavailable product evidence explicitly. Do not call old policy retention fresh provider verification.
  const unresolved = m.id.startsWith("meta/") || !sources.length;
  const retained = unresolved && prior?.basis === "policy";
  const reviewStatus = unresolved
    ? retained
      ? "prior-policy-retained"
      : "needs-confirmation"
    : "source-reviewed";
  sources.push({
    kind: "stored-openrouter-description",
    url: "https://openrouter.ai/api/v1/models",
    asOf: snapshot.asOf,
    localFile: "data/model-sources/openrouter-current.json",
    modelId: m.id,
    excerpt: m.description.split(/\s+/).slice(0, 22).join(" "),
  });
  rows.push({
    id: m.id,
    canonicalId: canonical(m.id),
    name: m.name,
    tier,
    previousTier: prior?.tier,
    reviewStatus,
    decisionDate: "2026-11-10",
    decisionBasis:
      "AIMI interpretation of product positioning, not a manufacturer-issued universal tier",
    reason: reason(m, tier),
    sources,
  });
}
const counts = Object.fromEntries(
  ["Small", "Medium", "High"].map((t) => [
    t,
    rows.filter((r) => r.tier === t).length,
  ]),
);
const summary = {
  counts,
  reviewStatus: Object.fromEntries(
    [...new Set(rows.map((r) => r.reviewStatus))].map((k) => [
      k,
      rows.filter((r) => r.reviewStatus === k).length,
    ]),
  ),
  changes: rows.filter((r) => r.previousTier !== r.tier).length,
};
const policy = {
  version: "model-groups-v3",
  reviewedAt: "2026-11-10",
  scope:
    "Same 156 selected model IDs; no outside models, price ranking, AA score ranking or LLM classification",
  definitions: {
    Small: "Lightweight/efficiency-oriented product group",
    Medium: "Balanced/general-purpose product group",
    High: "Upper/full-capability product group; not current performance rank or reasoning effort",
  },
  summary,
  models: rows,
};
await writeFile(
  "content/policies/model-groups-v3.json",
  JSON.stringify(policy, null, 2) + "\n",
);
const runtime = Object.fromEntries(
  rows.map((r) => [
    r.canonicalId,
    {
      tier: r.tier,
      reviewStatus: r.reviewStatus,
      reason: r.reason,
      sourceUrl:
        r.sources.find((s) => s.kind.startsWith("provider-"))?.url ??
        "https://openrouter.ai/" + r.id,
    },
  ]),
);
await writeFile(
  "packages/recommender/src/model-group-policy.ts",
  "// Generated from content/policies/model-groups-v3.json by tools/model-sync/build-group-review.mjs.\nexport const MODEL_GROUP_POLICY = " +
    JSON.stringify(runtime, null, 2) +
    " as const;\n",
);
await writeFile(
  "output/model-audit/group-review-summary.json",
  JSON.stringify(
    {
      summary,
      changed: rows
        .filter((r) => r.previousTier !== r.tier)
        .map(({ id, previousTier, tier, reviewStatus, reason }) => ({
          id,
          previousTier,
          tier,
          reviewStatus,
          reason,
        })),
      pending: rows
        .filter((r) => r.reviewStatus !== "source-reviewed")
        .map(({ id, tier, reviewStatus }) => ({ id, tier, reviewStatus })),
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify(summary));
