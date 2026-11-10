import type { UserState, AIJob } from "@aimi/contracts";
import { ApiError } from "../../db.js";
export type AIFeature = "optimizer" | "analysis";
/** Initialize legacy counters before reconciling known failed jobs. */
function usageFor(state: UserState, date: string) {
  const byDate = (state.aiUsage ??= {});
  if (!byDate[date]) {
    const analysis = (state.claims[date] ?? []).filter(
      (v) => v === "analysis",
    ).length;
    const jobs = Object.values(state.jobs).filter(
      (j) => j.date === date,
    ).length;
    byDate[date] = { optimizer: Math.max(0, jobs - analysis), analysis };
  }
  return byDate[date];
}
/** Call in the same transaction as failure; original reservation date, exactly once. */
export function releaseUserAI(state: UserState, job: AIJob) {
  const feature =
    job.quotaFeature ??
    (job.error === "AI_INVALID_TIP" ? "optimizer" : undefined);
  if (job.status !== "failed" || job.quotaRefunded || !feature) return;
  const usage = usageFor(state, job.date);
  usage[feature] = Math.max(0, usage[feature] - 1);
  job.quotaRefunded = true;
}
/** Reserve concurrent capacity; successful results consume it, failures release it. */
export function reserveUserAI(
  state: UserState,
  date: string,
  feature: AIFeature,
  limit: number,
) {
  const usage = usageFor(state, date);
  // Recover historical tip-validation failures without resetting successful usage.
  for (const job of Object.values(state.jobs)) {
    if (job.date === date) releaseUserAI(state, job);
  }
  if (usage[feature] >= limit) throw new ApiError("AI_DAILY_LIMIT", 429);
  usage[feature]++;
  return usage[feature];
}
