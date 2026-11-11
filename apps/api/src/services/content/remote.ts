import { PUZZLE_RULE_VERSION } from "@aimi/contracts";
import type { Pool } from "pg";
import { configureDailyProgram, dailyProgramVersion } from "./daily-program.js";
import { configureGeneratedContent } from "./generated.js";
let status = { source: "bundled", version: "", releases: 0, preview: false };
export function remoteContentStatus() {
  return { ...status, ruleVersion: PUZZLE_RULE_VERSION };
}
export async function loadRemoteContent(pool: Pool) {
  if (process.env.AIMI_CONTENT_SOURCE !== "supabase") return;
  const program = await pool.query(
    "SELECT version,program,release_versions FROM aimi.daily_programs WHERE active=true",
  );
  if (program.rowCount !== 1) throw Error("ACTIVE_CONTENT_PROGRAM_MISSING");
  const row = program.rows[0],
    versions = row.release_versions;
  const result = await pool.query(
    "SELECT version,manifest,target_url,review_status FROM aimi.content_releases WHERE version=ANY($1::text[])",
    [versions],
  );
  const releases = versions.map((v: string) =>
    result.rows.find((r) => r.version === v),
  );
  if (
    releases.some(
      (r: any) =>
        !r ||
        (r.review_status !== "approved" &&
          !(
            r.review_status === "preview" &&
            process.env.AIMI_CONTENT_PREVIEW === "true"
          )),
    )
  )
    throw Error("CONTENT_NOT_APPROVED");
  configureDailyProgram(row.program);
  configureGeneratedContent(releases);
  status = {
    source: "supabase",
    version: dailyProgramVersion(),
    releases: releases.length,
    preview: releases.some((r: any) => r.review_status === "preview"),
  };
}
