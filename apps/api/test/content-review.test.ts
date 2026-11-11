import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { composeKeywordSentence } from "@aimi/contracts";
import {
  generatedPack,
  packVersion,
  puzzleContent,
  puzzleFeedback,
  evaluatePuzzle,
} from "../src/services/content/generated.js";
const root = new URL("../../../", import.meta.url);
const read = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8"));
const rows = Array.from({ length: 10 }, (_, i) => {
  const day = `day-${String(i + 1).padStart(2, "0")}`;
  return {
    day,
    pack: read(
      `content/challenges/reviewed-10d-v3/${day}/manifest.private.json`,
    ),
    review: read(`content/challenges/reviewed-10d-v3/${day}/review.json`),
    legacy: read(
      `content/challenges/generated-10d-v2/${day}/manifest.private.json`,
    ),
  };
});
test("all ten visual reviews cover the original conditions/candidates and preserve image and generation evidence", () => {
  let conditions = 0,
    candidates = 0;
  for (const { day, pack, review, legacy } of rows) {
    const bytes = readFileSync(
      new URL(`apps/miniapp/public${pack.assets.app_target}`, root),
    );
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      pack.assets.sha256,
    );
    assert.equal(review.image_sha256, pack.assets.sha256);
    assert.equal(pack.authored_prompt, legacy.authored_prompt);
    assert.equal(
      pack.original_generation.model_plan.actual_model_id,
      legacy.model_plan.actual_model_id,
    );
    assert.deepEqual(
      review.conditions.map((c: any) => c.id),
      legacy.conditions.map((c: any) => c.id),
    );
    assert.deepEqual(
      review.old_candidates.map((c: any) => c.old_id),
      legacy.candidate_keywords.map((c: any) => c.id),
    );
    assert.ok(
      review.conditions.every(
        (c: any) =>
          c.review_status !== "unreviewed" &&
          c.review_note &&
          c.image_sha256 === pack.assets.sha256,
      ),
    );
    assert.ok(
      review.old_candidates.every((c: any) => c.disposition && c.reason),
    );
    assert.equal(pack.review.reviewer_kind, "ai");
    assert.equal(pack.published, false);
    assert.equal(pack.review.status, "approved");
    assert.equal(
      pack.review.review_basis,
      "user_requested_ai_visual_editorial_review",
    );
    assert.equal(pack.scoring.release_ready, true);
    assert.equal(
      pack.answer_count,
      pack.conditions.filter((c: any) => c.score_enabled).length,
      day,
    );
    conditions += review.conditions.length;
    candidates += review.old_candidates.length;
  }
  assert.equal(conditions, 114);
  assert.equal(candidates, 462);
});
test("reviewed answer sets, scoped candidates, hidden projections and selected-only sentences agree for every day", () => {
  for (const { pack } of rows) {
    const date = new Date(
      Date.UTC(2026, 10, 11 + Number(pack.id.slice(-2)) - 1),
    )
      .toISOString()
      .slice(0, 10);
    assert.equal(packVersion(generatedPack(date)), packVersion(pack));
    const pub = puzzleContent(pack, "review-user");
    assert.equal(
      new Set(pub.keywords.map((k) => k.id)).size,
      pub.keywords.length,
    );
    assert.equal(
      new Set(pub.keywords.map((k) => k.label)).size,
      pub.keywords.length,
    );
    const ids = pack.correct_keywords.map((k: any) => k.id);
    assert.equal(evaluatePuzzle(pack, ids, "low").passed, true);
    assert.equal(evaluatePuzzle(pack, [...ids].reverse(), "high").score, 100);
    assert.equal(
      evaluatePuzzle(
        pack,
        pub.keywords.map((k) => k.id),
        "low",
      ).passed,
      false,
    );
    assert.equal(
      puzzleContent(pack, "review-user", true).answerCount,
      ids.length,
    );
    for (const field of [
      "answerCount",
      "answer_prompt",
      "authored_prompt",
      "conditions",
      "tips",
      "learning_feedback",
      "correct_keywords",
    ])
      assert.equal(field in pub, false);
    assert.equal(
      "reveal" in puzzleFeedback(pack, ids.slice(1), 1, false),
      false,
    );
    const selected = pub.keywords.slice(0, 4);
    const sentence = composeKeywordSentence(selected);
    for (const word of selected)
      assert.ok(sentence.includes(word.sentenceFragment!));
    assert.equal(sentence, composeKeywordSentence([...selected].reverse()));
    assert.equal(
      evaluatePuzzle(
        pack,
        selected.map((k) => k.id),
        "low",
      ).sentence,
      sentence,
    );
    for (const h of pack.highlights)
      assert.equal(
        pack.answer_prompt.slice(h.start_utf16, h.end_utf16),
        h.matched_text,
      );
  }
});
test("twenty daily explanations and ten scoped model notes are released only after termination", () => {
  const texts = new Set<string>();
  const sources = read("content/challenges/reviewed-10d-v3/sources.json");
  for (const { pack } of rows) {
    const ids = pack.correct_keywords.map((k: any) => k.id);
    const reveal = puzzleFeedback(pack, ids, 1, true).reveal!;
    assert.equal(reveal.prompt, pack.answer_prompt);
    assert.equal(reveal.generationPrompt, pack.authored_prompt);
    assert.equal(reveal.generationPromptFormat, pack.prompt_format);
    assert.equal(reveal.tips.filter((t) => t.kind === "writing").length, 2);
    assert.equal(reveal.tips.filter((t) => t.kind === "model").length, 1);
    for (const tip of reveal.tips) {
      assert.ok(tip.title && tip.text);
      assert.ok(!texts.has(tip.text));
      texts.add(tip.text);
    }
    assert.ok(
      sources[pack.learning_feedback.source_ids[0]].url.startsWith("https://"),
    );
    const disabled = structuredClone(pack);
    disabled.model_plan.model_tips_enabled = false;
    assert.equal(puzzleFeedback(disabled, ids, 1, true).reveal!.tips.length, 2);
    const unmatched = structuredClone(pack);
    unmatched.tips[2].applicable_model_ids = ["another/model"];
    assert.equal(
      puzzleFeedback(unmatched, ids, 1, true).reveal!.tips.length,
      2,
    );
  }
  assert.equal(texts.size, 30);
});
test("old in-progress versions retain their original answers and original source prompt", () => {
  for (const { legacy } of rows) {
    const old = generatedPack("2026-11-11", packVersion(legacy));
    assert.equal(old.version, legacy.version);
    assert.deepEqual(old.correct_keywords, legacy.correct_keywords);
    assert.equal(
      puzzleFeedback(
        old,
        legacy.correct_keywords.map((k: any) => k.id),
        1,
        true,
      ).reveal!.prompt,
      legacy.authored_prompt,
    );
    assert.equal(
      evaluatePuzzle(
        old,
        legacy.correct_keywords.map((k: any) => k.id),
        "low",
      ).passed,
      true,
    );
  }
});
