import { readFileSync } from "node:fs";
import { z } from "zod";
import { GameKind, type DailyTip } from "@aimi/contracts";
const ProgramSchema = z.object({
  version: z.string(),
  tipStartDate: z.string(),
  gamesByWeekday: z.array(GameKind).length(7),
  tips: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        example: z.string(),
        body: z.string(),
      }),
    )
    .length(10),
});
let program = ProgramSchema.parse(
  JSON.parse(
    readFileSync(
      new URL(
        "../../../../../content/schedules/daily-program-v1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ),
);
const datedTips = new Map<string, DailyTip>();
export function configureScheduledTips(rows: { date: string; tip: DailyTip }[]) {
  const schema = z.object({ id: z.string().min(1), title: z.string().min(1), example: z.string().min(1), body: z.string().min(1) });
  const parsed = rows.map(r => ({ date: r.date, tip: schema.parse(r.tip) }));
  for (const r of parsed) datedTips.set(r.date, r.tip);
}
export function configureDailyProgram(value: unknown) {
  program = ProgramSchema.parse(value);
}
export function dailyProgramVersion() {
  return program.version;
}
export function dailyProgramForDate(date: string) {
  const time = Date.parse(date + "T00:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  )
    throw new Error("INVALID_CONTENT_DATE");
  const offset = Math.floor(
    (time - Date.parse(program.tipStartDate + "T00:00:00Z")) / 86400000,
  );
  return {
    date,
    scheduleVersion: program.version,
    gameKind: program.gamesByWeekday[new Date(time).getUTCDay()]!,
    todayTip: datedTips.get(date) ?? program.tips[
      ((offset % program.tips.length) + program.tips.length) %
        program.tips.length
    ]! as DailyTip,
  };
}
