import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  loadRemoteContent,
  remoteContentStatus,
} from "../src/services/content/remote.js";
import {
  generatedPack,
  puzzleContent,
} from "../src/services/content/generated.js";
import { dailyProgramForDate } from "../src/services/content/daily-program.js";
test("remote preview requires explicit permission and hydrates private content with public image URLs", async () => {
  const saved = {
    source: process.env.AIMI_CONTENT_SOURCE,
    preview: process.env.AIMI_CONTENT_PREVIEW,
  };
  const program = JSON.parse(
    await readFile(
      new URL(
        "../../../content/schedules/daily-program-v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const rows = await Promise.all(
    Array.from({ length: 10 }, async (_, i) => {
      const id = `day-${String(i + 1).padStart(2, "0")}`;
      return {
        version: id,
        manifest: JSON.parse(
          await readFile(
            new URL(
              `../../../content/challenges/generated-10d-v2/${id}/manifest.private.json`,
              import.meta.url,
            ),
            "utf8",
          ),
        ),
        target_url: `https://example.supabase.co/storage/v1/object/public/aimi-challenge-images/${id}.png`,
        review_status: "preview",
      };
    }),
  );
  const pool = {
    query: async (sql: string) =>
      sql.includes("daily_programs")
        ? {
            rowCount: 1,
            rows: [
              {
                version: program.version,
                program,
                release_versions: rows.map((r) => r.version),
              },
            ],
          }
        : { rowCount: 10, rows },
  } as any;
  try {
    process.env.AIMI_CONTENT_SOURCE = "supabase";
    delete process.env.AIMI_CONTENT_PREVIEW;
    await assert.rejects(() => loadRemoteContent(pool), /CONTENT_NOT_APPROVED/);
    process.env.AIMI_CONTENT_PREVIEW = "true";
    await loadRemoteContent(pool);
    assert.equal(remoteContentStatus().source, "supabase");
    assert.equal(remoteContentStatus().releases, 10);
    assert.equal(remoteContentStatus().preview, true);
    const pub = puzzleContent(generatedPack("2026-11-11"), "user");
    assert.ok(pub.target.startsWith("https://"));
    assert.equal(pub.reviewStatus, "unreviewed");
    assert.equal(pub.developmentSample, true);
    assert.equal(pub.answerCount, undefined);
    assert.equal("authored_prompt" in pub, false);
    assert.equal(dailyProgramForDate("2026-11-11").todayTip.id, "tip-01");
  } finally {
    if (saved.source === undefined) delete process.env.AIMI_CONTENT_SOURCE;
    else process.env.AIMI_CONTENT_SOURCE = saved.source;
    if (saved.preview === undefined) delete process.env.AIMI_CONTENT_PREVIEW;
    else process.env.AIMI_CONTENT_PREVIEW = saved.preview;
  }
});
