import { z } from "zod";
export const RewardType = z.enum(["attendance", "tip"]);
export type RewardType = z.infer<typeof RewardType>;
export const IdempotencyKey = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const EmptyBody = z.object({}).strict();
export const DevLogin = z
  .object({
    subject: z
      .string()
      .min(1)
      .max(80)
      .regex(/^[a-zA-Z0-9_-]+$/),
  })
  .strict();
export const Wallet = z.object({ balance: z.number().int().nonnegative() });
export const RewardResult = z.object({
  balance: z.number().int().nonnegative(),
  awarded: z.number().int().nonnegative(),
  alreadyClaimed: z.boolean(),
  rewardType: RewardType,
  localDate: z.string(),
});
export type RewardResult = z.infer<typeof RewardResult>;
export function seoulDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export * from "./prototype.js";
export * from "./auth.js";

export * from "./garden.js";

export * from "./content/asset-expansion.js";

export * from "./economy.js";

export * from "./ai/model-data.js";

export * from "./ai/output.js";

export * from "./ai/lifecycle.js";

export * from "./content/puzzle-sentence.js";
