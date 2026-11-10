import { isSupportedOutputKind } from "./output.js";
/** Public metadata audit is not proof of a successful per-account generation. */
export type ModelAvailability = {
  id: string;
  kind: string;
  name: string;
  status: string;
  visible: boolean;
  recommendationAllowed: boolean;
  checkedAt: string;
  shutdownDate: string | null;
  openrouterExpirationDate: string | null;
  endpointCount: number;
  activeEndpointCount: number;
  issues: string[];
  sources: {
    url: string;
    scope?: string;
    reason?: string;
    checkedAt?: string;
    date?: string | null;
  }[];
  generationTested: boolean;
  evidenceScope: string;
};
export type AvailabilityPolicy = {
  version: string;
  checkedAt: string;
  scope: string[];
  models: ModelAvailability[];
};
/** Date-only vendor notices use a conservative start-of-day cutoff in the app's Korean calendar.
 * This is AIMI's hold policy, not a claim about the provider's exact shutdown timezone. */
const cutoffDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const AUDIT_MAX_AGE_MS = 7 * 86400_000;
export function availabilityAllowsRecommendation(
  row: ModelAvailability | undefined,
  now = new Date(),
): boolean {
  if (!row) return true; // Legacy pure-unit fixtures; published API always attaches scoped audit rows.
  const age = now.getTime() - Date.parse(row.checkedAt);
  return (
    row.visible &&
    row.recommendationAllowed &&
    row.activeEndpointCount > 0 &&
    Number.isFinite(age) &&
    age >= 0 &&
    age <= AUDIT_MAX_AGE_MS &&
    (!row.shutdownDate || row.shutdownDate > cutoffDate(now))
  );
}
export function publishAvailableModels<
  T extends { id: string; media?: { kind: string } },
>(
  models: T[],
  policy: AvailabilityPolicy,
  now = new Date(),
): (T & { availability?: ModelAvailability })[] {
  const rows = new Map(policy.models.map((r) => [r.id, r]));
  return models.flatMap((model) => {
    const kind = model.media?.kind ?? "text",
      row = rows.get(model.id);
    if (!isSupportedOutputKind(kind)) return [];
    if (!policy.scope.includes(kind)) return [];
    // Missing new IDs never inherit an older model's clearance.
    if (
      !row ||
      !row.visible ||
      (row.shutdownDate && row.shutdownDate <= cutoffDate(now))
    )
      return [];
    return [{ ...model, availability: row }];
  });
}
export function availabilityLabel(
  row: ModelAvailability | undefined,
  now = new Date(),
): string | null {
  if (!row) return null;
  if (row.shutdownDate)
    return `제공 종료·폐기 안내 ${row.shutdownDate} · 신규 추천 제외`;
  if (!row.recommendationAllowed)
    return "사용 제한·폐기 안내 있음 · 신규 추천 제외";
  if (!availabilityAllowsRecommendation(row, now))
    return "제공 상태 재확인 필요 · 신규 추천 보류";
  return null;
}
