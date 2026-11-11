import { OutputKind, MediaRequest, type MediaInfo } from "./ai/output.js";
import type { AAProfile } from "./ai/model-data.js";
import { GardenPlacement, MAX_GARDEN_ITEMS } from "./garden.js";
import { z } from "zod";
export const GameKind = z.enum(["crossing", "dino", "runner"]);
export const Tier = z.enum(["Small", "Medium", "High"]);
export const GameInput = z
  .object({
    tick: z.number().int().positive(),
    action: z.enum(["forward", "back", "left", "right", "jump"]),
  })
  .strict();
export const CompleteGame = z
  .object({
    inputs: z.array(GameInput).max(2500),
    ticks: z.number().int().min(0).max(7200),
    abandon: z.boolean().default(false),
  })
  .strict();
export const AttemptInput = z
  .object({
    contentVersion: z.string().max(150).optional(),
    keywordIds: z.array(z.string().max(80)).max(100),
    model: z.enum(["low", "high"]).default("low"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
export const PurchaseInput = z
  .object({
    itemId: z.string().min(1).max(40),
    quantity: z.number().int().min(1).max(99).default(1),
  })
  .strict();
export const GardenInput = z
  .object({
    revision: z.number().int().nonnegative(),
    character: z.string().max(40),
    placements: z.array(GardenPlacement).max(MAX_GARDEN_ITEMS),
  })
  .strict();
export const TextInput = z
  .object({
    text: z.string().trim().min(2).max(4000),
    visitId: z.uuid().optional(),
  })
  .strict();
export const AnalyzeInput = TextInput.extend({
  tier: Tier.optional(),
  outputKind: OutputKind.optional(),
  media: MediaRequest.optional(),
});
export type TaskProfile = {
  requiredInputModalities?: string[];
  outputKind?: import("./ai/output.js").OutputKind;
  media?: import("./ai/output.js").MediaRequest;
  taskSummary?: string;
  taskType: "general" | "coding";
  requiredCapabilities: string[];
  suggestedTier: z.infer<typeof Tier>;
  reason: string;
  unknowns: string[];
};
export type Keyword = {
  sentenceClause?: string;
  id: string;
  label: string;
  group: string;
  value: string;
  cost: number;
};
export type CatalogItem = {
  id: string;
  name: string;
  kind: "item" | "character";
  price: number;
  asset: string;
};
export type DailyProgress = {
  challengeVersion?: string;
  challengeBudget?: number;
  challengeSpent?: number;
  challengeClosed?: boolean;
  answerCountPurchased?: boolean;
  date: string;
  gameKind: z.infer<typeof GameKind>;
  playsUsed: number;
  attemptsUsed: number;
  best: number;
  gameEP: number;
  success: boolean;
  lastAttempt: string | null;
};
export type Play = {
  id: string;
  date: string;
  kind: z.infer<typeof GameKind>;
  seed: number;
  version: string;
  startedAt: number;
  character: string;
  status: "running" | "failed" | "cleared" | "abandoned" | "expired";
  result?: {
    score: number;
    ep: number;
    best: number;
    budget: number;
    remaining: number;
    status: string;
  };
  inputs?: z.infer<typeof GameInput>[];
  ticks?: number;
};
export type Attempt = {
  matchedKeywordIds?: string[];
  feedbackStatus?: "complete" | "partial" | "mixed" | "none";
  ruleVersion?: string;
  attemptNumber?: number;
  answerCount?: number;
  incorrectKeywordIds?: string[];
  missingKeywordCount?: number;
  reveal?: {
    prompt: string;
    answerKeywordIds: string[];
    highlights: {
      start_utf16: number;
      end_utf16: number;
      matched_text: string;
    }[];
    tips: { title: string; text: string }[];
    modelId: string;
  };

  id: string;
  date: string;
  version: string;
  keywordIds: string[];
  model: "low" | "high";
  score: number;
  threshold: number;
  passed: boolean;
  ep: number;
  cost: number;
  budget: number;
  remaining: number;
  image: string;
  feedback: string[];
  sentence: string;
};
export type AIResult = {
  improvedText: string;
  extendedExample: string;
  addedAssumptions: string[];
  changes: string[];
  tips: { quote: string; tip: string }[];
  taskProfile: TaskProfile;
  source: "gemini" | "development-fixture";
};
export type AIJob = {
  id: string;
  date: string;
  textHash: string;
  createdAt: number;
  status: "running" | "succeeded" | "failed";
  result?: AIResult;
  taskAnalysis?: { task: TaskProfile; source: AIResult["source"] };
  error?: string;
  quotaFeature?: "optimizer" | "analysis";
  quotaRefunded?: boolean;
};
export type UserState = {
  version: 1;
  authEpoch: string;
  balance: number;
  name: string;
  code: string;
  selectedCharacter: string;
  inventory: string[];
  garden: {
    /** Deprecated: legacy read compatibility only. */
    slots: Record<string, string | null>;
    placements?: import("./garden.js").GardenPlacement[];
    revision: number;
    public: boolean;
  };
  days: Record<string, DailyProgress>;
  plays: Record<string, Play>;
  attempts: Record<string, Attempt>;
  claims: Record<string, string[]>;
  jobs: Record<string, AIJob>;
  aiUsage?: Record<string, { optimizer: number; analysis: number }>;
  friendRequests: string[];
  friends: string[];
  blocked: string[];
  requests: Record<
    string,
    { hash: string; response: unknown; operation?: string; createdAt?: number }
  >;
};
export type ModelRecord = {
  availability?: import("./ai/lifecycle.js").ModelAvailability;
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
  productTier?: "Small" | "Medium" | "High";
  canonicalId?: string;
  description?: string;
  inputModalities?: string[];
  outputModalities?: string[];
  supportedParameters?: string[];
  cacheInputPrice?: number | null;
  aaProfiles?: AAProfile[];
  defaultAAProfileId?: string;
  aaMetadata?: {
    matched: boolean;
    indices: Record<string, number | null>;
    firstAnswerToken: number | null;
    endToEnd: number | null;
  };
};

export type DailyTip = {
  id: string;
  title: string;
  example: string;
  body: string;
};
