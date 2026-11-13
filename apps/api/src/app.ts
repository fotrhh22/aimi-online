import { remoteContentStatus } from "./services/content/remote.js";
import Fastify, { LogController, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import type { Pool } from "pg";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import {
  DevLogin,
  EmptyBody,
  IdempotencyKey,
  RewardType,
  RewardResult,
  Wallet,
  seoulDate,
} from "@aimi/contracts";
import { ZodError } from "zod";
import type { Config } from "./config.js";
import { ApiError } from "./db.js";
import { registerDemo } from "./services/demo/register.js";
import { registerTossAuth } from "./services/toss/auth.js";
import { registerAnonymousAuth } from "./services/toss/anonymous.js";
import { registerPrototype } from "./modules/routes.js";
import { PostgresRepository } from "./modules/repository.js";
import { claimReward } from "./economy.js";

export function createApp(
  config: Config,
  pool: Pool,
  dependencies: {
    exchangeAnonymousCode?: (code: string) => Promise<string>;
  } = {},
) {
  const app = Fastify({
    bodyLimit: 200000,
    requestTimeout: 15000,
    genReqId: () => randomUUID(),
    logController: new LogController({ disableRequestLogging: true }),
    logger:
      config.LOG_LEVEL === "silent"
        ? false
        : {
            level: config.LOG_LEVEL,
            redact: [
              "req.headers.authorization",
              "req.body",
              "res.headers.authorization",
            ],
          },
  });
  app.register(cors, {
    origin: config.CORS_ALLOWED_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  });
  const hashToken = (token: string) =>
    createHmac("sha256", config.SESSION_SIGNING_KEY)
      .update(token)
      .digest("hex");
  const wrap = (request: FastifyRequest, data: unknown) => ({
    requestId: request.id,
    serverTime: new Date().toISOString(),
    localDate: seoulDate(),
    ruleVersion: "foundation-v1",
    dataVersion: "foundation-v1",
    data,
  });
  async function user(request: FastifyRequest): Promise<string> {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(
      request.headers.authorization || "",
    );
    if (!match) throw new ApiError("UNAUTHENTICATED", 401);
    const result = await pool.query(
      "SELECT user_id FROM aimi.sessions WHERE token_hash=$1 AND expires_at>now()",
      [hashToken(match[1])],
    );
    if (!result.rowCount) throw new ApiError("UNAUTHENTICATED", 401);
    return result.rows[0].user_id;
  }
  app.setErrorHandler((error, request, reply) => {
    const code =
      error instanceof ApiError
        ? error.code
        : error instanceof ZodError ||
            (error as { statusCode?: number }).statusCode === 400
          ? "INVALID_REQUEST"
          : "INTERNAL_ERROR";
    const status =
      error instanceof ApiError
        ? error.status
        : code === "INVALID_REQUEST"
          ? 400
          : 500;
    if (status >= 500)
      app.log.error({ requestId: request.id, code }, "Request failed");
    reply.status(status).send({
      ...wrap(request, null),
      error: {
        code,
        retryable: status === 503,
        attemptConsumed: false,
        budgetRestored: false,
      },
    });
  });
  app.get("/health/live", async () => ({ status: "ok" }));
  app.get("/health/ready", async (_request, reply) => {
    try {
      const result = await pool.query(
        "SELECT count(*)::int AS count FROM aimi.schema_migrations",
      );
      if (result.rows[0].count < 1) throw new Error("No migration");
      return {
        status: "ready",
        content: remoteContentStatus(),
        commit: process.env.RENDER_GIT_COMMIT ?? null,
      };
    } catch {
      return reply.status(503).send({ status: "unavailable" });
    }
  });
  // Registration itself is blocked in production and on Render; never use arbitrary IDs in deployed auth.
  if (config.NODE_ENV !== "production" && config.ENABLE_DEV_AUTH === "true") {
    app.post("/auth/dev", async (request) => {
      const { subject } = DevLogin.parse(request.body);
      const token = randomBytes(32).toString("hex");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          "INSERT INTO aimi.users(dev_subject) VALUES ($1) ON CONFLICT(dev_subject) DO UPDATE SET dev_subject=excluded.dev_subject RETURNING id",
          [subject],
        );
        const userId = result.rows[0].id;
        await client.query(
          "INSERT INTO aimi.ep_wallets(user_id) VALUES ($1) ON CONFLICT DO NOTHING",
          [userId],
        );
        await client.query(
          "INSERT INTO aimi.sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '1 hour')",
          [hashToken(token), userId],
        );
        await client.query("COMMIT");
        return wrap(request, { token, expiresIn: 3600, developmentOnly: true });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });
  }
  if (process.env.ENABLE_TEST_DEMO === "true") {
    registerDemo(app, pool, config.SESSION_SIGNING_KEY);
  }
  // Retired Vercel demos must never authenticate, read records or invoke AI.
  for (const url of ["/web-demo", "/web-demo/*"]) {
    app.route({
      method: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
      url,
      handler: async () => {
        throw new ApiError("WEB_DEMO_CLOSED", 410);
      },
    });
  }
  const unlinkToss = registerTossAuth(
    app,
    pool,
    config.SESSION_SIGNING_KEY,
    user,
  );
  registerAnonymousAuth(
    app,
    pool,
    config.SESSION_SIGNING_KEY,
    dependencies.exchangeAnonymousCode,
  );
  app.post("/auth/logout", async (request) => {
    await user(request);
    await pool.query("DELETE FROM aimi.sessions WHERE token_hash=$1", [
      hashToken(request.headers.authorization!.slice(7)),
    ]);
    return wrap(request, { loggedOut: true });
  });
  app.get("/wallet", async (request) => {
    const userId = await user(request);
    const result = await pool.query(
      "SELECT balance FROM aimi.ep_wallets WHERE user_id=$1",
      [userId],
    );
    return wrap(request, Wallet.parse(result.rows[0]));
  });
  app.get("/home", async (request) => {
    const userId = await user(request);
    const result = await pool.query(
      "SELECT balance FROM aimi.ep_wallets WHERE user_id=$1",
      [userId],
    );
    const claims = await pool.query(
      "SELECT reward_type FROM aimi.daily_reward_claims WHERE user_id=$1 AND local_date=$2",
      [userId, seoulDate()],
    );
    return wrap(request, {
      wallet: Wallet.parse(result.rows[0]),
      claimedRewards: claims.rows.map((r) => r.reward_type),
      mission: null,
    });
  });
  app.post<{ Params: { type: string } }>(
    "/daily-rewards/:type/claim",
    async (request) => {
      const userId = await user(request);
      const type = RewardType.parse(request.params.type);
      EmptyBody.parse(request.body ?? {});
      const key = IdempotencyKey.parse(request.headers["idempotency-key"]);
      return wrap(
        request,
        RewardResult.parse(
          await claimReward(
            pool,
            userId,
            type,
            key,
            config.NODE_ENV === "production",
          ),
        ),
      );
    },
  );
  registerPrototype(app, new PostgresRepository(pool), user, unlinkToss);
  return app;
}
