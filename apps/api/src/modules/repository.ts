import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";
import type { Pool } from "pg";
import { ApiError } from "../db.js";
import { ECONOMY_POLICY, type UserState } from "@aimi/contracts";
export function newState(id: string, development = false): UserState {
  return {
    version: 1,
    authEpoch: randomUUID(),
    balance: development ? 125 : 0,
    name: "새싹이",
    code: createHash("sha256")
      .update(id)
      .digest("hex")
      .slice(0, 8)
      .toUpperCase(),
    selectedCharacter: "seed",
    inventory: development ? ["seed", "bear", "flower"] : ["seed"],
    garden: {
      placements: [],
      slots: {
        back: null,
        "front-left": null,
        "front-right": null,
        "back-right": null,
      },
      revision: 0,
      public: true,
    },
    days: {},
    plays: {},
    attempts: {},
    claims: {},
    jobs: {},
    aiUsage: {},
    friendRequests: [],
    friends: [],
    blocked: [],
    requests: {},
  };
}
export interface Repository {
  development: boolean;
  aiDailyLimit?: number;
  read(id: string): Promise<UserState>;
  transaction<T>(
    ids: string[],
    fn: (states: Record<string, UserState>) => T,
  ): Promise<T>;
  findCode(code: string): Promise<string | null>;
  reserveAI(date: string, limit: number): Promise<void>;
  pruneAI(before: number): Promise<void>;
  remove(id: string): Promise<void>;
}
function prune(state: UserState, before: number) {
  for (const [id, job] of Object.entries(state.jobs))
    if (job.createdAt < before) delete state.jobs[id];
  for (const [key, r] of Object.entries(state.requests))
    if (
      (r.operation === "optimizer" || r.operation === "recommendation") &&
      (r.createdAt ?? 0) < before
    )
      delete state.requests[key];
}
/** Local-only fixture store: memory by default; an explicit path opts into persistence. */
export class FileRepository implements Repository {
  readonly development = true;
  private queue: Promise<unknown> = Promise.resolve();
  private memory: Record<string, UserState> = {};
  constructor(private path?: string) {
    if (process.env.NODE_ENV === "production" || process.env.RENDER)
      throw new Error("LOCAL_REPOSITORY_FORBIDDEN");
  }
  private async load(): Promise<Record<string, UserState>> {
    if (!this.path) return structuredClone(this.memory);
    try {
      return JSON.parse(await readFile(this.path, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw e;
    }
  }
  private async save(data: Record<string, UserState>) {
    if (!this.path) {
      this.memory = structuredClone(data);
      return;
    }
    await mkdir(dirname(this.path), { recursive: true });
    const tmp = this.path + "." + randomUUID() + ".tmp";
    await writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
    await rename(tmp, this.path);
  }
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn);
    this.queue = result.catch(() => {});
    return result;
  }
  async read(id: string) {
    return this.transaction([id], (s) => structuredClone(s[id]));
  }
  async transaction<T>(
    ids: string[],
    fn: (states: Record<string, UserState>) => T,
  ): Promise<T> {
    return this.serial(async () => {
      const data = await this.load();
      for (const id of ids) {
        data[id] ??= newState(id, true);
        data[id].authEpoch ??= randomUUID();
      }
      const result = fn(data);
      await this.save(data);
      return structuredClone(result);
    });
  }
  async pruneAI(before: number) {
    await this.serial(async () => {
      const data = await this.load();
      for (const state of Object.values(data)) prune(state, before);
      await this.save(data);
    });
  }
  async existing(id: string) {
    await this.queue;
    return (await this.load())[id] ?? null;
  }
  async reserveAI(date: string, limit: number) {
    await this.transaction(["__ai_usage__"], (s) => {
      const calls = (s.__ai_usage__.claims[date] ??= []);
      if (calls.length >= limit) throw new ApiError("AI_SERVICE_LIMIT", 429);
      calls.push("call");
    });
  }
  async findCode(code: string) {
    await this.queue;
    const data = await this.load();
    return Object.entries(data).find(([, s]) => s.code === code)?.[0] ?? null;
  }
  async remove(id: string) {
    await this.serial(async () => {
      const data = await this.load();
      delete data[id];
      for (const s of Object.values(data)) {
        s.friends = s.friends.filter((v) => v !== id);
        s.friendRequests = s.friendRequests.filter((v) => v !== id);
        s.blocked = s.blocked.filter((v) => v !== id);
      }
      await this.save(data);
    });
  }
}
/** PostgreSQL aggregate storage uses the existing wallet/ledger under the same transaction. */
export class PostgresRepository implements Repository {
  readonly development = false;
  constructor(private pool: Pool) {}
  async read(id: string) {
    return this.transaction([id], (s) => structuredClone(s[id]));
  }
  async transaction<T>(
    ids: string[],
    fn: (states: Record<string, UserState>) => T,
  ): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const states: Record<string, UserState> = {},
        before: Record<string, number> = {};
      for (const id of [...new Set(ids)].sort()) {
        const initial = newState(id);
        await c.query(
          "INSERT INTO aimi.prototype_states(user_id,state,friend_code) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING",
          [id, initial, initial.code],
        );
        const w = await c.query(
          "SELECT balance FROM aimi.ep_wallets WHERE user_id=$1 FOR UPDATE",
          [id],
        );
        if (!w.rowCount) throw new Error("WALLET_NOT_FOUND");
        const r = await c.query(
          "SELECT state FROM aimi.prototype_states WHERE user_id=$1 FOR UPDATE",
          [id],
        );
        states[id] = r.rows[0].state;
        states[id].balance = w.rows[0].balance;
        before[id] = w.rows[0].balance;
      }
      const result = fn(states);
      for (const id of Object.keys(states)) {
        const s = states[id],
          delta = s.balance - before[id];
        if (!Number.isSafeInteger(s.balance) || s.balance < 0)
          throw new Error("INVALID_BALANCE");
        if (delta) {
          await c.query(
            "UPDATE aimi.ep_wallets SET balance=$2,updated_at=now() WHERE user_id=$1",
            [id, s.balance],
          );
          await c.query(
            "INSERT INTO aimi.ep_ledger(user_id,event_key,delta,balance_after,rule_version) VALUES($1,$2,$3,$4,$5)",
            [
              id,
              "v1:" + randomUUID(),
              delta,
              s.balance,
              ECONOMY_POLICY.version,
            ],
          );
        }
        await c.query(
          "UPDATE aimi.prototype_states SET state=$2,updated_at=now() WHERE user_id=$1",
          [id, s],
        );
      }
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async pruneAI(before: number) {
    const rows = await this.pool.query(
      "SELECT user_id FROM aimi.prototype_states WHERE state->'jobs'<>'{}'::jsonb",
    );
    for (const row of rows.rows)
      await this.transaction([row.user_id], (s) =>
        prune(s[row.user_id], before),
      ).catch(() => {});
  }
  async reserveAI(date: string, limit: number) {
    const r = await this.pool.query(
      "INSERT INTO aimi.ai_daily_usage(local_date,calls) VALUES($1,1) ON CONFLICT(local_date) DO UPDATE SET calls=aimi.ai_daily_usage.calls+1 WHERE aimi.ai_daily_usage.calls<$2 RETURNING calls",
      [date, limit],
    );
    if (!r.rowCount) throw new ApiError("AI_SERVICE_LIMIT", 429);
  }
  async findCode(code: string) {
    const r = await this.pool.query(
      "SELECT user_id FROM aimi.prototype_states WHERE friend_code=$1",
      [code],
    );
    return r.rows[0]?.user_id ?? null;
  }
  async remove(id: string) {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("DELETE FROM aimi.users WHERE id=$1", [id]);
      await c.query(
        "UPDATE aimi.prototype_states SET state=jsonb_set(jsonb_set(jsonb_set(state,'{friends}',COALESCE((state->'friends')-$1,'[]'::jsonb)),'{friendRequests}',COALESCE((state->'friendRequests')-$1,'[]'::jsonb)),'{blocked}',COALESCE((state->'blocked')-$1,'[]'::jsonb))",
        [id],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
