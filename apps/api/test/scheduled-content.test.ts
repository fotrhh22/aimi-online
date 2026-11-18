import test from "node:test";
import assert from "node:assert/strict";
import { generatedPack, packVersion, configureScheduledPacks, puzzleContent } from "../src/services/content/generated.js";
import { dailyProgramForDate } from "../src/services/content/daily-program.js";
import { refreshScheduledContent } from "../src/services/content/scheduled.js";
test("dated approved release preserves pinned content and updates tip with one concurrent read", async () => {
  const date = "2027-01-01", fallback = generatedPack(date), pinned = packVersion(fallback);
  const scheduled = structuredClone(fallback);
  Object.assign(scheduled,{id:"dated-2027-01-01",version:"aimi-puzzle-pack-weekly-v1",published:true,review:{status:"approved"}});
  const row = {date,manifest:scheduled,target_url:"https://example.com/image.png",review_status:"approved",daily_tip:{title:"날짜별 팁",example:"예: 두 개",body:"대상과 개수를 연결해요"}};
  let queries=0;
  const pool={query:async()=>{queries++;await Promise.resolve();return {rows:[row]};}} as any;
  await Promise.all([refreshScheduledContent(pool),refreshScheduledContent(pool)]);
  assert.equal(queries,1);
  assert.equal(generatedPack(date).id,scheduled.id);
  assert.equal(generatedPack(date,pinned).id,fallback.id);
  assert.equal(dailyProgramForDate(date).todayTip.title,"날짜별 팁");
  assert.equal(puzzleContent(generatedPack(date),"user").target,row.target_url);
  assert.equal("authored_prompt" in puzzleContent(generatedPack(date),"user"),false);
  assert.throws(()=>configureScheduledPacks([{...row,review_status:"preview"}]),/INVALID_SCHEDULED_CONTENT/);
  assert.throws(()=>configureScheduledPacks([{...row,manifest:{...scheduled,version:"changed"}}]),/SCHEDULED_CONTENT_IMMUTABLE/);
  assert.equal(generatedPack(date).version,scheduled.version);
});
test("invalid tip is rejected before changing active content",async()=>{
  const date="2027-01-02",before=generatedPack(date);
  const pool={query:async()=>({rows:[{date,manifest:{...before,id:"new"},daily_tip:{},target_url:"https://example.com/test",review_status:"approved"}]})} as any;
  await assert.rejects(refreshScheduledContent(pool));assert.equal(generatedPack(date),before);
});
