/** AIMI product positioning decisions, not manufacturer-issued universal performance tiers. */
import { MODEL_GROUP_POLICY } from "./model-group-policy.js";
export type Tier = "Small" | "Medium" | "High";
export type GroupReviewStatus =
  | "source-reviewed"
  | "needs-confirmation"
  | "prior-policy-retained"
  | "unreviewed";
export const MODEL_GROUP_POLICY_VERSION = "model-groups-v3";
export function canonicalModelId(id: string) {
  return id
    .replace(/:(free|batch|extended|nitro|exacto)$/, "")
    .replace(/-batch$/, "");
}
export function productGroup(id: string): {
  tier: Tier;
  basis: "policy" | "provisional";
  reason: string;
  reviewStatus: GroupReviewStatus;
  sourceUrl?: string;
} {
  const entry =
    MODEL_GROUP_POLICY[canonicalModelId(id) as keyof typeof MODEL_GROUP_POLICY];
  if (entry)
    return {
      tier: entry.tier,
      basis:
        entry.reviewStatus === "needs-confirmation" ? "provisional" : "policy",
      reason: entry.reason,
      reviewStatus: entry.reviewStatus,
      sourceUrl: entry.sourceUrl,
    };
  return {
    tier: "Medium",
    basis: "provisional",
    reviewStatus: "unreviewed",
    reason:
      "아직 제품군 검수를 하지 않은 모델이에요. 탐색용 임시 배치이며 추천 근거로 사용하지 않아요.",
  };
}
