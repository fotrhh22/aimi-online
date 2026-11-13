/** Offline multimodal catalogue. Dedicated endpoint prices are kept in their original units. */
import { readFile, writeFile } from "node:fs/promises";
const base = "data/model-sources/multimodal/";
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const raw = await read(base + "models-all.json");
const images = await read(base + "image-models.json");
const videos = await read(base + "video-models.json");
const collected = await read(base + "collection.json");
const asOf = collected.fetchedAt;
const imageById = new Map(images.data.map((m) => [m.id, m]));
const videoById = new Map(videos.data.map((m) => [m.id, m]));
// Fixed reviewed positioning table. New models remain provisional and never enter cost recommendations automatically.
const fixedPolicy = await read("content/policies/media-model-groups-v1.json");
const byPolicy = new Map(fixedPolicy.models.map((m) => [m.id, m]));
const models = [];
const policies = [];
const seen = new Set();
for (const r of raw.data) {
  const outputs = r.architecture?.output_modalities ?? [];
  if (!outputs.some((x) => x !== "text") || r.id.startsWith("openrouter/"))
    continue;
  const canonical = r.canonical_slug ?? r.id;
  if (
    seen.has(canonical) ||
    /:free$/.test(r.id) ||
    (r.id.endsWith("-preview") &&
      raw.data.some((m) => m.id === r.id.replace(/-preview$/, "")))
  )
    continue;
  seen.add(canonical);
  const image = imageById.get(r.id),
    video = videoById.get(r.id);
  const endpoints = image
    ? (
        await read(
          base + "image-endpoints/" + r.id.replaceAll("/", "__") + ".json",
        )
      ).endpoints
    : [];
  const kind = video
    ? "video"
    : image
      ? "image"
      : outputs.find((o) => o !== "text");
  const registered = byPolicy.get(r.id);
  const tier = registered?.tier ?? "Medium";
  const sourceUrl = "https://openrouter.ai/" + r.id;
  const operation = /upscal/i.test(r.id)
    ? "upscale"
    : /\bedit(?:ing)?\b|design.layer/i.test(r.id)
      ? "edit"
      : "generate";
  const policy = registered ?? {
    id: r.id,
    tier,
    sourceUrl,
    sourceExcerpt: r.description ?? "",
    reviewStatus: "unreviewed",
    reason: "새 모델의 제품군 근거 검수 전 탐색용 임시 배치. 자동 추천 제외.",
  };
  policies.push(policy);
  models.push({
    id: r.id,
    name: r.name.replace(/^[^:]+: /, ""),
    provider: r.name.includes(": ")
      ? r.name.split(": ")[0]
      : r.id.split("/")[0],
    canonicalId: canonical,
    description: r.description ?? "",
    inputModalities: r.architecture.input_modalities,
    outputModalities: outputs,
    supportedParameters: Array.isArray(r.supported_parameters)
      ? r.supported_parameters
      : [],
    capabilities: [
      ...(r.architecture.input_modalities ?? []),
      ...(Array.isArray(r.supported_parameters) &&
      r.supported_parameters.includes("tools")
        ? ["tools"]
        : []),
    ],
    context: r.context_length ?? 0,
    maxOutput: r.top_provider?.max_completion_tokens ?? 0,
    inputPrice: Number(r.pricing?.prompt ?? 0),
    outputPrice: Number(r.pricing?.completion ?? 0),
    intelligence: null,
    coding: null,
    speed: null,
    latency: null,
    source: "OpenRouter multimodal model and dedicated generation APIs",
    asOf,
    indexVersion: "not-applicable",
    verified: false,
    productTier: tier,
    media: {
      kind,
      operation,
      sourceUrl,
      groupPolicy: policy,
      parameters: image?.supported_parameters ?? {},
      imageEndpoints: endpoints,
      video: video ?? null,
      rawPricing: r.pricing ?? {},
      benchmarks: r.benchmarks ?? {},
      apiRoutes: r.endpoints ?? [],
    },
  });
}
await writeFile(
  "content/fixtures/models-media.json",
  JSON.stringify(
    { version: "multimodal-v1", asOf, developmentSample: false, models },
    null,
    2,
  ) + "\n",
);

const counts = Object.fromEntries(
  [...new Set(models.map((m) => m.media.kind))].map((k) => [
    k,
    models.filter((m) => m.media.kind === k).length,
  ]),
);
console.log(
  JSON.stringify({ raw: raw.data.length, media: models.length, counts }),
);
