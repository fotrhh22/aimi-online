import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { PUZZLE_ATTEMPT_COST, type Keyword } from "@aimi/contracts";
import { ApiError } from "../../db.js";
export type PuzzlePack = {
  id: string;
  version: string;
  title: string;
  published: boolean;
  authored_prompt: string;
  correct_keywords: { id: string }[];
  display_labels: Record<string, string>;
  candidate_keywords: { id: string }[];
  tips: { title: string; text: string; requires_actual_model_match: boolean }[];
  highlights: {
    start_utf16: number;
    end_utf16: number;
    matched_text: string;
  }[];
  assets: { generated: boolean; sha256: string };
  model_plan: { actual_model_id: string };
};
let packs = Array.from({ length: 10 }, (_, i) => {
  const day = `day-${String(i + 1).padStart(2, "0")}`;
  const p = JSON.parse(
    readFileSync(
      new URL(
        `../../../../../content/challenges/generated-10d-v2/${day}/manifest.private.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ) as PuzzlePack;
  if (!p.assets.generated || !p.assets.sha256)
    throw Error("GENERATED_CONTENT_MISSING");
  return p;
});
let remoteEnabled = false;
const urls = new Map<string, string>();
const reviews = new Map<string, string>();
export function generatedContentEnabled(development: boolean) {
  return development || remoteEnabled;
}
export function configureGeneratedContent(
  rows: { manifest: PuzzlePack; target_url: string; review_status: string }[],
) {
  if (rows.length !== 10 || new Set(rows.map((r) => r.manifest.id)).size !== 10)
    throw Error("INVALID_REMOTE_CONTENT_COUNT");
  for (const r of rows) {
    const p = r.manifest;
    if (
      !p.assets?.generated ||
      !p.assets.sha256 ||
      !p.correct_keywords?.length ||
      !p.candidate_keywords?.length ||
      !p.display_labels ||
      !/^https:\/\//.test(r.target_url)
    )
      throw Error("INVALID_REMOTE_CONTENT");
    if (
      p.correct_keywords.some(
        (k) => !p.candidate_keywords.some((c) => c.id === k.id),
      )
    )
      throw Error("INVALID_REMOTE_ANSWER_KEY");
    urls.set(p.id, r.target_url);
    reviews.set(p.id, r.review_status);
  }
  packs = rows.map((r) => r.manifest);
  remoteEnabled = true;
}
function targetFor(p: PuzzlePack) {
  return urls.get(p.id) ?? `/content/challenges/generated-10d-v2/${p.id}.png`;
}
export function packVersion(p: PuzzlePack) {
  return `${p.id}:${p.version}:${p.assets.sha256.slice(0, 12)}`;
}
export function generatedPack(date: string, version?: string) {
  if (version) {
    const p = packs.find((p) => packVersion(p) === version);
    if (!p) throw new ApiError("CONTENT_VERSION_UNAVAILABLE", 503);
    return p;
  }
  const offset = Math.floor(
    (Date.parse(date + "T00:00:00Z") - Date.parse("2026-11-11T00:00:00Z")) /
      86400000,
  );
  return packs[((offset % 10) + 10) % 10]!;
}
export function puzzleContent(p: PuzzlePack, seed: string, attempts = 0) {
  const keywords: Keyword[] = p.candidate_keywords.map((k) => ({
    id: k.id,
    label: p.display_labels[k.id]!,
    group: "",
    value: "",
    cost: 0,
  }));
  keywords.sort((a, b) =>
    createHash("sha256")
      .update(seed + a.id)
      .digest("hex")
      .localeCompare(
        createHash("sha256")
          .update(seed + b.id)
          .digest("hex"),
      ),
  );
  return {
    version: packVersion(p),
    ruleVersion: "aimi-keyword-set-v3",
    title: "이미지 챌린지 · " + p.id.replace("day-", "Day "),
    target: targetFor(p),
    keywords,
    developmentSample: reviews.get(p.id) !== "approved",
    reviewStatus: reviews.get(p.id) === "approved" ? "approved" : "unreviewed",
    generationModel: p.model_plan.actual_model_id,
    ...(attempts ? { answerCount: p.correct_keywords.length } : {}),
  };
}
export function evaluatePuzzle(
  p: PuzzlePack,
  ids: string[],
  model: "low" | "high",
) {
  const allowed = new Set(p.candidate_keywords.map((k) => k.id)),
    selected = new Set(ids),
    answers = new Set(p.correct_keywords.map((k) => k.id));
  if (
    !ids.length ||
    selected.size !== ids.length ||
    ids.some((id) => !allowed.has(id))
  )
    throw new ApiError("INVALID_KEYWORDS");
  const matched = ids.filter((id) => answers.has(id)).length;
  const score =
    Math.floor((1000 * matched) / (selected.size + answers.size - matched)) /
    10;
  return {
    version: packVersion(p),
    score,
    threshold: 100,
    passed: selected.size === answers.size && matched === answers.size,
    cost: PUZZLE_ATTEMPT_COST,
    image: targetFor(p),
    sentence:
      ids.map((id) => p.display_labels[id]).join(" · ") + " 조건으로 표현해줘.",
    feedback: [] as string[],
  };
}
export function puzzleFeedback(
  p: PuzzlePack,
  ids: string[],
  attemptNumber: number,
  closed: boolean,
) {
  const answers = new Set(p.correct_keywords.map((k) => k.id));
  return {
    attemptNumber,
    answerCount: answers.size,
    ...(attemptNumber >= 2
      ? {
          incorrectKeywordIds: ids.filter((id) => !answers.has(id)),
          missingKeywordCount: [...answers].filter((id) => !ids.includes(id))
            .length,
        }
      : {}),
    ...(closed
      ? {
          reveal: {
            prompt: p.authored_prompt,
            answerKeywordIds: [...answers],
            highlights: p.highlights,
            tips: p.tips
              .filter((t) => !t.requires_actual_model_match)
              .map((t) => ({ title: t.title, text: t.text })),
            modelId: p.model_plan.actual_model_id,
          },
        }
      : {}),
  };
}

export function puzzlePreviews() {
  return packs.map((p) => ({
    id: p.id,
    target: targetFor(p),
    model: p.model_plan.actual_model_id,
  }));
}
