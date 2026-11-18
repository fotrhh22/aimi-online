import type { Pool } from "pg";
import { z } from "zod";
import { configureScheduledPacks, type PuzzlePack } from "./generated.js";
import { configureScheduledTips } from "./daily-program.js";
let inFlight: Promise<void> | undefined;
const cursors = new WeakMap<Pool, string>();
/** One background read per minute, no extra client request and no startup auth work. */
export async function refreshScheduledContent(pool: Pool): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const result = await pool.query(`SELECT to_char(s.scheduled_date,'YYYY-MM-DD') AS date,
      r.manifest,r.target_url,r.review_status,s.daily_tip,p.approved_at
      FROM aimi.scheduled_content s JOIN aimi.content_releases r ON r.version=s.release_version
      JOIN aimi.content_publications p ON p.batch_id=s.batch_id
      WHERE r.review_status='approved' AND p.approved_at >= $1::timestamptz
      ORDER BY p.approved_at,s.scheduled_date`, [cursors.get(pool) ?? '1970-01-01T00:00:00Z']);
    const tipSchema = z.object({title:z.string().min(1),example:z.string().min(1),body:z.string().min(1)});
    const tips = result.rows.map(r => ({date:r.date,tip:{...tipSchema.parse(r.daily_tip),id:`scheduled-tip-${r.date}`}}));
    configureScheduledPacks(result.rows as {date:string;manifest:PuzzlePack;target_url:string;review_status:string}[]);
    configureScheduledTips(tips);
    const times=result.rows.map(r => new Date(r.approved_at).getTime()).filter(Number.isFinite);
    if (times.length) cursors.set(pool,new Date(Math.max(...times)).toISOString());
  })();
  try { await inFlight; } finally { inFlight = undefined; }
}
