import { z } from "zod";
export const OutputKind = z.enum([
  "text",
  "image",
  "video",
  "audio",
  "speech",
  "transcription",
  "embeddings",
  "rerank",
  "decisions",
]);
export type OutputKind = z.infer<typeof OutputKind>;
export const SUPPORTED_OUTPUT_KINDS = ["text", "image", "video"] as const;
export function isSupportedOutputKind(
  kind: string,
): kind is (typeof SUPPORTED_OUTPUT_KINDS)[number] {
  return (SUPPORTED_OUTPUT_KINDS as readonly string[]).includes(kind);
}
export const OUTPUT_LABELS: Record<OutputKind, string> = {
  text: "텍스트",
  image: "이미지",
  video: "영상",
  audio: "오디오·음악",
  speech: "음성 생성",
  transcription: "음성 → 글",
  embeddings: "임베딩",
  rerank: "검색 재정렬",
  decisions: "구조화 판단",
};
export const MediaRequest = z
  .object({
    operation: z.enum(["generate", "edit", "upscale"]).optional(),
    resolution: z.enum(["1K", "2K", "4K", "480p", "720p", "1080p"]).optional(),
    aspectRatio: z.enum(["1:1", "16:9", "9:16"]).optional(),
    durationSeconds: z.number().int().min(1).max(120).optional(),
    generateAudio: z.boolean().optional(),
    referenceImages: z.number().int().min(0).max(16).optional(),
  })
  .strict();
export type MediaRequest = z.infer<typeof MediaRequest>;
export type ImageParameter = {
  type: string;
  values?: (string | number)[];
  min?: number;
  max?: number;
};
export type ImageRate = {
  billable: string;
  unit: string;
  cost_usd: number;
  variant?: string;
};
export type MediaInfo = {
  kind: string;
  operation: "generate" | "edit" | "upscale";
  sourceUrl: string;
  groupPolicy: {
    id: string;
    tier: "Small" | "Medium" | "High";
    reason: string;
    reviewStatus: string;
    sourceUrl: string;
    sourceExcerpt: string;
  };
  parameters: Record<string, ImageParameter>;
  imageEndpoints: {
    provider_name: string;
    provider_tag?: string;
    supported_parameters: Record<string, ImageParameter>;
    pricing: ImageRate[];
  }[];
  video: null | {
    supported_resolutions?: string[];
    supported_aspect_ratios?: string[];
    supported_durations?: number[];
    generate_audio?: boolean;
    pricing_skus?: Record<string, string>;
  };
  rawPricing: Record<string, string>;
  benchmarks: Record<string, unknown>;
  apiRoutes: string[];
};
