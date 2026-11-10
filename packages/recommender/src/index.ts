import {
  isSupportedOutputKind,
  availabilityAllowsRecommendation,
  type ModelAvailability,
} from "@aimi/contracts";
import { recommendMedia } from "./media.js";
import type { MediaInfo, MediaRequest, OutputKind } from "@aimi/contracts";
export {
  supportsOutput,
  comparisonRequest,
  comparisonSummary,
  estimateMedia,
} from "./media.js";
import { productGroup, canonicalModelId, type Tier } from "./model-groups.js";
export { MODEL_GROUP_POLICY_VERSION } from "./model-groups.js";
export type { Tier } from "./model-groups.js";
export const RECOMMENDATION_POLICY_VERSION = "recommendation-v6";
export type Model = {
  availability?: ModelAvailability;
  outputModalities?: string[];
  inputModalities?: string[];
  media?: MediaInfo;
  id: string;
  name: string;
  provider: string;
  context: number;
  maxOutput: number;
  capabilities: string[];
  inputPrice: number;
  outputPrice: number;
  intelligence: number | null;
  coding: number | null;
  speed: number | null;
  latency: number | null;
  source: string;
  asOf: string;
  indexVersion: string;
  verified: boolean;
  /** Only populated by curated local policy/tests, never by the LLM. */
  productTier?: Tier;
  aaMetadata?: {
    matched: boolean;
    indices: Record<string, number | null>;
    firstAnswerToken: number | null;
    endToEnd: number | null;
  };
};
/** Stable model family; evidence is checked separately by recommend(). */
export function modelTier(_models: Model[], model: Model): Tier | null {
  if (model.productTier) return model.productTier;
  const group = productGroup(model.id);
  return group.basis === "policy" ? group.tier : null;
}
export function recommend(
  models: Model[],
  task: {
    taskType: "general" | "coding";
    requiredCapabilities: string[];
    outputKind?: OutputKind;
    media?: MediaRequest;
  },
  tier: Tier,
  now = new Date(),
  allowFixture = false,
) {
  if (!isSupportedOutputKind(task.outputKind ?? "text"))
    return {
      status: "UNSUPPORTED_OUTPUT",
      models: [] as Model[],
      threshold: null,
    };
  models = models.filter((m) =>
    availabilityAllowsRecommendation(m.availability, now),
  );
  if (task.outputKind && task.outputKind !== "text")
    return recommendMedia(models, task, tier, now);
  models = models.filter(
    (m) => !m.media && (m.outputModalities?.includes("text") ?? true),
  );
  const metric = task.taskType === "coding" ? "coding" : "intelligence";
  const valid = models.filter(
    (m) => m.verified && Number.isFinite(m[metric]) && (m[metric] ?? -1) >= 0,
  );
  const versions = new Set(valid.map((m) => m.indexVersion));
  if (versions.size !== 1 || (!allowFixture && !versions.has("5")))
    return {
      status: "INSUFFICIENT_EVIDENCE",
      models: [] as Model[],
      threshold: null,
    };
  const population = Array.from(new Map(valid.map((m) => [m.id, m])).values());
  if (population.length < 10 && !allowFixture)
    return {
      status: "INSUFFICIENT_EVIDENCE",
      models: [] as Model[],
      threshold: null,
    };
  if (!population.length)
    return {
      status: "INSUFFICIENT_EVIDENCE",
      models: [] as Model[],
      threshold: null,
    };
  // Versioned AIMI prototype quality floors. Not AA product tiers or task guarantees.
  const threshold = { Small: 5, Medium: 12, High: 20 }[tier];
  const eligible = population.filter(
    (m) =>
      m[metric]! >= threshold &&
      modelTier(models, m) === tier &&
      task.requiredCapabilities.every(
        (c) => m.capabilities.includes(c) || !!m.inputModalities?.includes(c),
      ) &&
      m.context >= 3000 &&
      m.maxOutput >= 1000 &&
      [m.inputPrice, m.outputPrice].every(
        (x) => Number.isFinite(x) && x >= 0,
      ) &&
      Date.parse(m.asOf) <= now.getTime() &&
      now.getTime() - Date.parse(m.asOf) <= 30 * 86400_000,
  );
  const cost = (m: Model) => 2000 * m.inputPrice + 1000 * m.outputPrice;
  eligible.sort(
    (a, b) =>
      cost(a) - cost(b) ||
      b[metric]! - a[metric]! ||
      (a.latency ?? Infinity) - (b.latency ?? Infinity) ||
      a.id.localeCompare(b.id),
  );
  return {
    status: eligible.length ? "ok" : "NO_ELIGIBLE_MODEL",
    models: eligible.slice(0, 3),
    threshold,
  };
}

export type CatalogClassification = {
  tier: Tier;
  basis: "policy" | "variant" | "provisional";
  reason: string;
  reviewStatus?: import("./model-groups.js").GroupReviewStatus;
  sourceUrl?: string;
};
export function catalogClassifications(
  models: Model[],
): Map<string, CatalogClassification> {
  return new Map(
    models.map((m) => {
      const group = m.media
        ? {
            tier: m.productTier ?? ("Medium" as Tier),
            basis:
              m.media.groupPolicy.reviewStatus === "source-reviewed"
                ? ("policy" as const)
                : ("provisional" as const),
            reason: m.media.groupPolicy.reason,
            sourceUrl: m.media.sourceUrl,
            reviewStatus:
              m.media.groupPolicy.reviewStatus === "source-reviewed"
                ? ("source-reviewed" as const)
                : ("unreviewed" as const),
          }
        : m.productTier
          ? {
              tier: m.productTier,
              basis: "policy" as const,
              reason: "등록된 모델군 정책이에요.",
            }
          : productGroup(m.id);
      return [
        m.id,
        {
          ...group,
          basis:
            group.basis === "policy" && canonicalModelId(m.id) !== m.id
              ? "variant"
              : group.basis,
        },
      ];
    }),
  );
}
