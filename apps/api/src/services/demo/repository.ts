import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  clampGardenPlacement,
  seoulDate,
  type UserState,
} from "@aimi/contracts";
import { ApiError } from "../../db.js";
import { daily } from "../../modules/domain.js";
import { newState, type Repository } from "../../modules/repository.js";
export const DEMO_FRIEND = "demo-friend";
export const demoUser = (epoch: string) => "demo-player-" + epoch;
export type DemoStore = {
  state: Record<string, UserState>;
  epoch: string;
  starts_at: Date | null;
  ends_at: Date | null;
  ai_calls: number[];
  last_reset_at: Date;
};
export function initialDemoStates(epoch: string) {
  const uid = demoUser(epoch),
    me = newState(uid, true),
    friend = newState(DEMO_FRIEND, true);
  me.name = "테스트 새싹이";
  friend.name = "모모 · 테스트 친구";
  friend.selectedCharacter = "fox";
  friend.inventory = [
    "seed",
    "fox",
    "apple-tree",
    "wood-sign",
    "carrot-bed",
    "garden-lamp",
  ];
  friend.garden.placements = [
    { itemId: "apple-tree", instanceId: "demo-tree", x: 0.22, y: 0.54 },
    { itemId: "wood-sign", instanceId: "demo-sign", x: 0.77, y: 0.46 },
    { itemId: "carrot-bed", instanceId: "demo-carrot", x: 0.26, y: 0.88 },
    { itemId: "garden-lamp", instanceId: "demo-lamp", x: 0.83, y: 0.7 },
  ].map(clampGardenPlacement);
  daily(friend, seoulDate()).success = true;
  me.friends = [DEMO_FRIEND];
  friend.friends = [uid];
  return { [uid]: me, [DEMO_FRIEND]: friend };
}
export function reserveDemoCall(row: DemoStore, now: number, limit = 20) {
  if (!row.ends_at || now >= new Date(row.ends_at).getTime())
    throw new ApiError("DEMO_AI_EXPIRED", 429);
  row.ai_calls = row.ai_calls.filter((t) => t > now - 3600000);
  if (row.ai_calls.length >= limit)
    throw new ApiError("DEMO_AI_HOURLY_LIMIT", 429);
  row.ai_calls.push(now);
}
/** All demo state is isolated in this table; production users/wallets are never queried. */
export class DemoRepository implements Repository {
  readonly development = false;
  readonly aiDailyLimit = 10000;
  constructor(
    private pool: Pool,
    readonly storeId = "shared-ui-test-v1",
  ) {}
  async withStore<T>(fn: (row: DemoStore) => T): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query(
        "INSERT INTO aimi.test_demo_stores(id) VALUES($1) ON CONFLICT DO NOTHING",
        [this.storeId],
      );
      const r = await c.query(
        "SELECT * FROM aimi.test_demo_stores WHERE id=$1 FOR UPDATE",
        [this.storeId],
      );
      const row = r.rows[0] as DemoStore;
      if (!Object.keys(row.state).length)
        row.state = initialDemoStates(row.epoch);
      const result = fn(row);
      await c.query(
        "UPDATE aimi.test_demo_stores SET state=$2,epoch=$3,starts_at=$4,ends_at=$5,ai_calls=$6,last_reset_at=$7 WHERE id=$1",
        [
          this.storeId,
          row.state,
          row.epoch,
          row.starts_at,
          row.ends_at,
          JSON.stringify(row.ai_calls),
          row.last_reset_at,
        ],
      );
      await c.query("COMMIT");
      return structuredClone(result);
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async read(id: string) {
    return this.transaction([id], (s) => structuredClone(s[id]));
  }
  async transaction<T>(ids: string[], fn: (s: Record<string, UserState>) => T) {
    return this.withStore((row) => {
      if (ids.some((id) => id !== demoUser(row.epoch) && id !== DEMO_FRIEND))
        throw new ApiError("UNAUTHENTICATED", 401);
      return fn(row.state);
    });
  }
  async findCode(code: string) {
    return this.withStore(
      (row) =>
        Object.entries(row.state).find(([, v]) => v.code === code)?.[0] ?? null,
    );
  }
  async reserveAI(_date: string, _limit: number) {
    if (!process.env.AIMI_GEMINI_API_KEY)
      throw new ApiError("AI_NOT_CONFIGURED", 503);
    await this.withStore((row) => reserveDemoCall(row, Date.now()));
  }
  async pruneAI(_before: number) {
    /* Reset and the existing job lifecycle bound this shared test store. */
  }
  async remove(_id: string): Promise<void> {
    throw new ApiError("DEMO_RESET_REQUIRED", 409);
  }
  async reset(epoch: string) {
    return this.withStore((row) => {
      if (row.epoch !== epoch) throw new ApiError("UNAUTHENTICATED", 401);
      if (Date.now() - new Date(row.last_reset_at).getTime() < 2000)
        throw new ApiError("DEMO_RESET_BUSY", 429);
      row.epoch = randomUUID();
      row.state = initialDemoStates(row.epoch);
      row.last_reset_at = new Date();
      // Usage history and the original 48h expiry deliberately survive reset.
      return row.epoch;
    });
  }
}
