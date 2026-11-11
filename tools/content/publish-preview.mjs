import { PUZZLE_RULE_VERSION } from "@aimi/contracts";
/** Upload generated images and seed private content; does not approve or expose answers publicly. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parse } from "dotenv";
import { createPool } from "../../apps/api/src/db.ts";
const nativeFetch = globalThis.fetch;
async function fetch(...args) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      return await nativeFetch(...args);
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw Error("STORAGE_CONNECTION_FAILED:" + last?.cause?.code);
}
const env = parse(
  await readFile(new URL("../../apps/api/.env.local", import.meta.url)),
);
for (const name of [
  "MIGRATION_DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
])
  if (!env[name]) throw Error("MISSING_" + name);
const bucket = "aimi-challenge-images";
const auth = {
  Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
  apikey: env.SUPABASE_SECRET_KEY,
};
const endpoint = env.SUPABASE_URL + "/storage/v1";
const list = await fetch(endpoint + "/bucket", { headers: auth });
if (!list.ok) throw Error("BUCKET_LIST_FAILED");
const buckets = await list.json();
if (!buckets.some((b) => b.id === bucket)) {
  const r = await fetch(endpoint + "/bucket", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 5242880,
      allowed_mime_types: ["image/png"],
    }),
  });
  if (!r.ok) throw Error("BUCKET_CREATE_FAILED:" + r.status);
} else if (!buckets.find((b) => b.id === bucket).public)
  throw Error("EXISTING_BUCKET_IS_PRIVATE");
const rows = [];
for (let n = 1; n <= 10; n++) {
  const day = `day-${String(n).padStart(2, "0")}`;
  const bytes = await readFile(
    new URL(
      `../../apps/miniapp/public/content/challenges/generated-10d-v2/${day}.png`,
      import.meta.url,
    ),
  );
  const hash = createHash("sha256").update(bytes).digest("hex");
  const key = `preview/batch-10d-v2/${day}/${hash}.png`,
    url = endpoint + "/object/public/" + bucket + "/" + key;
  const old = await fetch(url);
  if (old.ok) {
    if (
      createHash("sha256")
        .update(Buffer.from(await old.arrayBuffer()))
        .digest("hex") !== hash
    )
      throw Error("EXISTING_ASSET_HASH_MISMATCH");
  } else if (old.status === 400 || old.status === 404) {
    const r = await fetch(endpoint + "/object/" + bucket + "/" + key, {
      method: "POST",
      headers: { ...auth, "Content-Type": "image/png", "x-upsert": "false" },
      body: bytes,
    });
    if (!r.ok) throw Error("ASSET_UPLOAD_FAILED:" + day + ":" + r.status);
  } else throw Error("ASSET_READ_FAILED:" + old.status);
  const verified = await fetch(url);
  if (
    !verified.ok ||
    createHash("sha256")
      .update(Buffer.from(await verified.arrayBuffer()))
      .digest("hex") !== hash
  )
    throw Error("ASSET_VERIFY_FAILED");
  const manifest = JSON.parse(
    await readFile(
      new URL(
        `../../content/challenges/generated-10d-v2/${day}/manifest.private.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const original = manifest.assets.sha256;
  manifest.assets.sha256 = hash;
  manifest.assets.target_storage_key = bucket + "/" + key;
  manifest.review.events.push({
    event: "storage_uploaded_preview",
    at: new Date().toISOString(),
    source_sha256: original,
    storage_sha256: hash,
  });
  const version = `${day}:${manifest.version}:${hash.slice(0, 12)}`;
  rows.push({ version, day, manifest, key: bucket + "/" + key, url, hash });
  console.log("Verified preview image: " + day);
}
const pool = createPool(env.MIGRATION_DATABASE_URL),
  c = await pool.connect();
try {
  await c.query("BEGIN");
  await c.query(
    "SELECT pg_advisory_xact_lock(hashtext('aimi-content-publication'))",
  );
  for (const r of rows) {
    const q = await c.query(
      `INSERT INTO aimi.content_releases(version,day_id,rule_version,review_status,manifest,target_storage_key,target_url,asset_sha256) VALUES($1,$2,$7,'preview',$3,$4,$5,$6) ON CONFLICT(version) DO UPDATE SET rule_version=excluded.rule_version,manifest=excluded.manifest,target_url=excluded.target_url WHERE content_releases.review_status='preview' RETURNING version`,
      [r.version, r.day, r.manifest, r.key, r.url, r.hash, PUZZLE_RULE_VERSION],
    );
    if (q.rowCount !== 1) throw Error("APPROVED_CONTENT_IMMUTABLE");
  }
  const program = JSON.parse(
    await readFile(
      new URL("../../content/schedules/daily-program-v1.json", import.meta.url),
      "utf8",
    ),
  );
  await c.query("UPDATE aimi.daily_programs SET active=false WHERE active");
  await c.query(
    `INSERT INTO aimi.daily_programs(version,program,release_versions,active) VALUES($1,$2,$3,true) ON CONFLICT(version) DO UPDATE SET program=excluded.program,release_versions=excluded.release_versions,active=true,updated_at=now()`,
    [
      program.version + "-preview-20261111",
      program,
      JSON.stringify(rows.map((r) => r.version)),
    ],
  );
  await c.query("COMMIT");
  await mkdir(new URL("../../output/releases/", import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL(
      "../../output/releases/content-preview-20261111.json",
      import.meta.url,
    ),
    JSON.stringify(
      {
        uploadedAt: new Date().toISOString(),
        program: program.version,
        reviewStatus: "preview",
        tips: program.tips.length,
        images: rows.map(({ manifest, ...r }) => r),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify({
      images: rows.length,
      tips: program.tips.length,
      status: "preview",
      gameSchedule: program.gamesByWeekday,
    }),
  );
} catch (e) {
  await c.query("ROLLBACK");
  throw Error("CONTENT_DB_TRANSACTION_FAILED:" + e.message);
} finally {
  c.release();
  await pool.end();
}
