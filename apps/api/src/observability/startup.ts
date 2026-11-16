import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool, PoolClient, QueryResultRow } from "pg";

type Phase = "db_connect" | "db_query" | "partner";
type Timing = {
  started: number;
  uptimeAtStartMs: number;
  phases: Record<Phase, { ms: number; count: number }>;
};
const context = new AsyncLocalStorage<Timing>();
const instance = randomUUID();
const bootAt = new Date(Date.now() - process.uptime() * 1000).toISOString();
let contentLoadMs: number | null = null;
const paths = new Set(["/v1/state", "/v1/content", "/auth/anonymous", "/health/live", "/health/ready"]);
const round = (value: number) => Math.round(value * 100) / 100;

export function recordBootContentLoad(ms: number) { contentLoadMs = round(ms); }

// Capture timing context before awaiting; concurrent users never share accumulators.
export async function measurePhase<T>(phase: Phase, fn: () => Promise<T>): Promise<T> {
  const timing = context.getStore();
  if (!timing) return fn();
  const start = performance.now();
  try { return await fn(); }
  finally {
    timing.phases[phase].ms += performance.now() - start;
    timing.phases[phase].count++;
  }
}

/** Promise-query client facade. Does not patch pg clients or change transaction/release ownership. */
export async function measuredConnection(pool: Pool): Promise<PoolClient> {
  const client = await measurePhase("db_connect", () => pool.connect());
  if (!context.getStore()) return client;
  return new Proxy(client, {
    get(target, property) {
      if (property === "query") return (...args: unknown[]) =>
        measurePhase("db_query", () => Reflect.apply(target.query, target, args));
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** Equivalent to pool.query for the promise-based call sites used by startup reads. */
export async function measuredQuery<T extends QueryResultRow = QueryResultRow>(pool: Pool, sql: string, values?: unknown[]) {
  // Tests and non-startup routes retain the original pool.query implementation.
  if (!context.getStore()) return pool.query<T>(sql, values);
  const client = await measuredConnection(pool);
  try { return await client.query<T>(sql, values); }
  finally { client.release(); }
}

export function registerStartupTimings(app: FastifyInstance, pool: Pool) {
  const timings = new WeakMap<FastifyRequest, Timing>();
  app.addHook("onRequest", (request, _reply, done) => {
    const path = request.url.split("?", 1)[0];
    if (!paths.has(path)) return done();
    const timing: Timing = { started: performance.now(), uptimeAtStartMs: round(process.uptime() * 1000),
      phases: { db_connect: { ms: 0, count: 0 }, db_query: { ms: 0, count: 0 }, partner: { ms: 0, count: 0 } } };
    timings.set(request, timing);
    context.run(timing, done);
  });
  app.addHook("onSend", async (request, reply, payload) => {
    const timing = timings.get(request);
    if (!timing) return payload;
    const entries = ["app;dur=" + round(performance.now() - timing.started),
      "uptime;dur=" + timing.uptimeAtStartMs,
      ...Object.entries(timing.phases).map(([name, phase]) => `${name};dur=${round(phase.ms)}`)];
    reply.header("Server-Timing", entries.join(", "));
    reply.header("X-Request-ID", request.id);
    reply.header("X-AIMI-Instance", instance);
    reply.header("X-AIMI-Boot-At", bootAt);
    return payload;
  });
  app.addHook("onResponse", async (request, reply) => {
    const timing = timings.get(request);
    if (!timing) return;
    const totals = Object.fromEntries(Object.entries(timing.phases).flatMap(([name, phase]) =>
      [[name + "Ms", round(phase.ms)], [name + "Count", phase.count]]));
    // Explicit allowlist: never log URL queries, identities, SQL, parameters, bodies or headers.
    app.log.info({ event: "startup_request", requestId: request.id, instance,
      path: request.url.split("?", 1)[0], method: request.method, status: reply.statusCode,
      bootAt, uptimeAtStartMs: timing.uptimeAtStartMs, appMs: round(performance.now() - timing.started),
      ...totals, poolTotal: pool.totalCount ?? 0, poolIdle: pool.idleCount ?? 0, poolWaiting: pool.waitingCount ?? 0 }, "Startup request timing");
    timings.delete(request);
  });
  app.addHook("onReady", async () => {
    app.log.info({ event: "startup_ready", instance, bootAt, readyUptimeMs: round(process.uptime() * 1000),
      contentLoadMs, commit: process.env.RENDER_GIT_COMMIT ?? null }, "Startup ready");
  });
  app.addHook("onListen", async () => {
    app.log.info({ event: "startup_listening", instance, bootAt,
      listeningUptimeMs: round(process.uptime() * 1000), contentLoadMs,
      commit: process.env.RENDER_GIT_COMMIT ?? null }, "Startup listening");
  });
}
