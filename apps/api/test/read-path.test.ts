import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { PostgresRepository, newState } from "../src/modules/repository.js";
import { DemoRepository, demoUser } from "../src/services/demo/repository.js";

test("production readMany uses one wallet/state snapshot without locks or writes", async () => {
  const ids = [randomUUID(), randomUUID()],
    sql: string[] = [];
  const pool = {
    query: async (q: string, args: unknown[]) => {
      sql.push(q);
      assert.deepEqual(args, [[...ids]]);
      return {
        rows: ids.map((id, i) => ({
          user_id: id,
          state: { ...newState(id), balance: 999 },
          balance: i + 2,
        })),
      };
    },
    connect: () => {
      throw Error("read must not acquire transaction");
    },
  } as unknown as Pool;
  const repo = new PostgresRepository(pool);
  const states = await repo.readMany([...ids, ids[0]]);
  assert.equal(states[ids[0]].balance, 2);
  assert.equal(states[ids[1]].balance, 3);
  assert.equal(sql.length, 1);
  assert.doesNotMatch(sql[0], /FOR UPDATE|INSERT|UPDATE|BEGIN/);
  assert.deepEqual(await repo.readMany([]), {});
  assert.equal(sql.length, 1);
});
test("production existing read never saves history or changes wallet", async () => {
  const id = randomUUID();
  let queries = 0;
  const pool = {
    query: async () => {
      queries++;
      return { rows: [{ user_id: id, state: newState(id), balance: 125 }] };
    },
    connect: () => {
      throw Error("read transaction");
    },
  } as unknown as Pool;
  assert.equal((await new PostgresRepository(pool).read(id)).balance, 125);
  assert.equal(queries, 1);
});
test("demo read validates current epoch snapshot; stale reset tokens cannot read old state", async () => {
  const epoch = randomUUID(),
    id = demoUser(epoch),
    queries: string[] = [];
  const pool = {
    query: async (q: string) => {
      queries.push(q);
      return { rows: [{ epoch, state: { [id]: newState(id) } }], rowCount: 1 };
    },
    connect: () => {
      throw Error("demo read write");
    },
  } as unknown as Pool;
  const repo = new DemoRepository(pool);
  assert.equal((await repo.read(id)).balance, 0);
  await assert.rejects(repo.read(demoUser(randomUUID())), /UNAUTHENTICATED/);
  assert.ok(queries.every((q) => !/FOR UPDATE|INSERT|UPDATE|BEGIN/.test(q)));
});
