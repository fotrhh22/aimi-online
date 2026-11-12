// Explicit guarded promotion of the already-reviewed active ten-day pack.
// Default is read/verify only. --apply changes review_status, never images or schedules.
import "../../apps/api/src/config.js";
import { createPool } from "../../apps/api/src/db.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
const apply = process.argv.includes("--apply");
const pool = createPool(process.env.MIGRATION_DATABASE_URL!);
const c = await pool.connect();
try {
  const programs = await c.query(
    "SELECT version,release_versions FROM aimi.daily_programs WHERE active=true",
  );
  if (
    programs.rowCount !== 1 ||
    programs.rows[0].release_versions.length !== 10
  )
    throw Error("ACTIVE_TEN_DAY_PROGRAM_REQUIRED");
  const program = programs.rows[0];
  const releases = await c.query(
    "SELECT version,day_id,review_status,manifest,target_url,asset_sha256 FROM aimi.content_releases WHERE version=ANY($1::text[])",
    [program.release_versions],
  );
  if (releases.rowCount !== 10) throw Error("TEN_RELEASES_REQUIRED");
  const checked = [];
  for (const row of releases.rows) {
    if (!/^day-\d{2}$/.test(row.day_id)) throw Error("INVALID_DAY");
    const pack = JSON.parse(
      await readFile(
        `content/challenges/reviewed-10d-v3/${row.day_id}/manifest.private.json`,
        "utf8",
      ),
    );
    const review = JSON.parse(
      await readFile(
        `content/challenges/reviewed-10d-v3/${row.day_id}/review.json`,
        "utf8",
      ),
    );
    if (
      pack.review?.status !== "approved" ||
      !pack.scoring?.release_ready ||
      review.image_sha256 !== pack.assets.sha256 ||
      row.asset_sha256 !== pack.assets.sha256
    )
      throw Error("REVIEW_REQUIRED:" + row.day_id);
    for (const field of [
      "authored_prompt",
      "answer_prompt",
      "correct_keywords",
      "candidate_keywords",
      "display_labels",
      "conditions",
      "tips",
      "model_plan",
      "scoring",
      "learning_feedback",
    ])
      if (!isDeepStrictEqual(row.manifest[field], pack[field]))
        throw Error("CONTENT_MISMATCH:" + row.day_id + ":" + field);
    const url = new URL(row.target_url);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co"))
      throw Error("UNEXPECTED_STORAGE_HOST");
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Error("IMAGE_UNAVAILABLE:" + row.day_id);
    const hash = createHash("sha256")
      .update(new Uint8Array(await response.arrayBuffer()))
      .digest("hex");
    if (hash !== pack.assets.sha256)
      throw Error("IMAGE_HASH_MISMATCH:" + row.day_id);
    checked.push({
      day: row.day_id,
      version: row.version,
      sha256: hash,
      previous: row.review_status,
    });
  }
  if (apply) {
    await c.query("BEGIN");
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('aimi-content-publication'))",
    );
    const current = await c.query(
      "SELECT version FROM aimi.daily_programs WHERE active=true FOR UPDATE",
    );
    if (current.rows[0]?.version !== program.version)
      throw Error("PROGRAM_CHANGED");
    for (const row of releases.rows) {
      const updated = await c.query(
        "UPDATE aimi.content_releases SET review_status='approved' WHERE version=$1 AND asset_sha256=$2 AND manifest=$3::jsonb AND review_status IN ('preview','approved') RETURNING version",
        [row.version, row.asset_sha256, JSON.stringify(row.manifest)],
      );
      if (updated.rowCount !== 1) throw Error("RELEASE_CHANGED:" + row.day_id);
    }
    await c.query("COMMIT");
  }
  const report = {
    date: new Date().toISOString(),
    applied: apply,
    program: program.version,
    checked,
  };
  await mkdir("output/releases/nongame-ready", { recursive: true });
  await writeFile(
    "output/releases/nongame-ready/content-" +
      (apply ? "approved" : "verified") +
      ".json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      applied: apply,
      verified: checked.length,
      program: program.version,
    }),
  );
} catch (error) {
  await c.query("ROLLBACK").catch(() => {});
  console.error(
    error instanceof Error ? error.message : "Content verification failed",
  );
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
