import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Pool } from "pg";
import { ApiError } from "../../db.js";
import type { UserState } from "@aimi/contracts";
import {
  DemoRepository,
  demoUser,
  DEMO_FRIEND,
  type DemoStore,
} from "./repository.js";

export function accountHash(raw: string) {
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(code))
    throw new ApiError("INVALID_ACCESS_CODE", 400);
  return createHash("sha256")
    .update("aimi-web-account:" + code)
    .digest("hex");
}
export function personalToken(secret: string, hash: string, epoch: string) {
  const payload = `guest.${hash}.${epoch}`;
  return (
    payload + "." + createHmac("sha256", secret).update(payload).digest("hex")
  );
}
export function personalIdentity(secret: string, auth: string) {
  const m =
    /^Bearer (guest\.([a-f0-9]{64})\.([a-f0-9-]{36})\.[a-f0-9]{64})$/.exec(
      auth,
    );
  if (!m) throw new ApiError("UNAUTHENTICATED", 401);
  if (
    !timingSafeEqual(
      Buffer.from(m[1]),
      Buffer.from(personalToken(secret, m[2], m[3])),
    )
  )
    throw new ApiError("UNAUTHENTICATED", 401);
  return { hash: m[2], epoch: m[3] };
}

/** A request-local repository: concurrent visitors never share a mutable selected account. */
export const personalScope = new AsyncLocalStorage<{ repo: DemoRepository }>();
export function scopedRepository(fallback: DemoRepository): DemoRepository {
  return new Proxy(fallback, {
    get(_target, key) {
      const repo =
        personalScope.getStore()?.repo ??
        (["development", "aiDailyLimit", "pruneAI"].includes(String(key))
          ? fallback
          : undefined);
      if (!repo) throw new Error("PERSONAL_REQUEST_SCOPE_REQUIRED");
      const value = Reflect.get(repo, key);
      return typeof value === "function" ? value.bind(repo) : value;
    },
  });
}

export class PersonalDemoRepository extends DemoRepository {
  private quota: DemoRepository;
  constructor(
    pool: Pool,
    readonly hash: string,
  ) {
    super(pool, "personal-web:" + hash);
    this.quota = new DemoRepository(pool);
  }
  override reserveAI(date: string, limit: number) {
    return this.quota.reserveAI(date, limit);
  }
  override async status(id: string) {
    await super.status(id);
    // The shared billing cap and expiry cannot be renewed by account creation/reset.
    const r = await this.pool.query(
      "SELECT starts_at,ends_at,ai_calls FROM aimi.test_demo_stores WHERE id=$1",
      [this.quota.storeId],
    );
    return (r.rows[0] ?? {
      starts_at: null,
      ends_at: null,
      ai_calls: [],
    }) as DemoStore;
  }
  override async readMany(ids: string[]) {
    const own = await this.pool.query(
      "SELECT epoch,state FROM aimi.test_demo_stores WHERE id=$1",
      [this.storeId],
    );
    const row = own.rows[0] as DemoStore | undefined;
    if (!row) throw new ApiError("UNAUTHENTICATED", 401);
    const result: Record<string, UserState> = {};
    const foreign = [];
    for (const id of ids) {
      if (row.state[id]) result[id] = structuredClone(row.state[id]);
      else if (id.startsWith("demo-player-")) foreign.push(id);
    }
    if (foreign.length) {
      const peers = await this.pool.query(
        "SELECT state FROM aimi.test_demo_stores WHERE id LIKE 'personal-web:%' AND state ?| $1::text[]",
        [foreign],
      );
      for (const peer of peers.rows)
        for (const id of foreign)
          if (peer.state[id]) result[id] = structuredClone(peer.state[id]);
    }
    return result;
  }
  override async findCode(code: string) {
    const own = await super.findCode(code);
    if (own) return own;
    const r = await this.pool.query(
      "SELECT p.key FROM aimi.test_demo_stores d CROSS JOIN LATERAL jsonb_each(d.state) p WHERE d.id LIKE 'personal-web:%' AND p.key LIKE 'demo-player-%' AND p.value->>'code'=$1 LIMIT 2",
      [code],
    );
    if (r.rowCount === 1) return r.rows[0].key as string;
    return null;
  }
  override async transaction<T>(
    ids: string[],
    fn: (s: Record<string, UserState>) => T,
  ): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const r = await c.query(
        "SELECT id,epoch,state FROM aimi.test_demo_stores WHERE id=$1 OR (id LIKE 'personal-web:%' AND state ?| $2::text[]) ORDER BY id FOR UPDATE",
        [this.storeId, ids.filter((id) => id !== DEMO_FRIEND)],
      );
      const own = r.rows.find((row) => row.id === this.storeId);
      if (!own || !ids.includes(demoUser(own.epoch)))
        throw new ApiError("UNAUTHENTICATED", 401);
      const states: Record<string, UserState> = {};
      for (const id of ids) {
        const source =
          id === DEMO_FRIEND ? own : r.rows.find((row) => row.state[id]);
        if (!source?.state[id]) throw new ApiError("UNAUTHENTICATED", 401);
        states[id] = source.state[id];
      }
      const result = fn(states);
      for (const row of r.rows) {
        for (const id of ids)
          if (
            id in row.state &&
            (id !== DEMO_FRIEND || row.id === this.storeId)
          )
            row.state[id] = states[id];
        await c.query("UPDATE aimi.test_demo_stores SET state=$2 WHERE id=$1", [
          row.id,
          row.state,
        ]);
      }
      await c.query("COMMIT");
      return structuredClone(result);
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
}
export async function personalSession(
  pool: Pool,
  secret: string,
  rawCode?: string,
) {
  const code =
    rawCode ??
    randomBytes(16).toString("hex").toUpperCase().match(/.{8}/g)!.join("-");
  const hash = accountHash(code),
    repo = new PersonalDemoRepository(pool, hash);
  if (rawCode) {
    const r = await pool.query(
      "SELECT epoch FROM aimi.test_demo_stores WHERE id=$1",
      [repo.storeId],
    );
    if (!r.rowCount) throw new ApiError("ACCESS_CODE_NOT_FOUND", 404);
    return {
      token: personalToken(secret, hash, r.rows[0].epoch),
      personal: true,
    };
  }
  const row = await repo.withStore((row) => {
    row.state[demoUser(row.epoch)].name = "나의 새싹이";
    return { epoch: row.epoch };
  });
  return {
    token: personalToken(secret, hash, row.epoch),
    personal: true,
    accessCode: code,
  };
}
