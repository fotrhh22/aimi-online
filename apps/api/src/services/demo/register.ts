import {
  personalIdentity,
  personalToken,
  personalSession,
  personalScope,
  scopedRepository,
  PersonalDemoRepository,
} from "./personal.js";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { ECONOMY_POLICY, IdempotencyKey, seoulDate } from "@aimi/contracts";
import { once } from "../../modules/domain.js";
import { ApiError } from "../../db.js";
import { registerPrototype } from "../../modules/routes.js";
import { DemoRepository, demoUser } from "./repository.js";
export function demoToken(secret: string, epoch: string) {
  const sig = createHmac("sha256", secret)
    .update("aimi-test-demo:" + epoch)
    .digest("hex");
  return "demo." + epoch + "." + sig;
}
export function demoTokenEpoch(secret: string, value: string) {
  const m = /^Bearer (demo\.([a-f0-9-]{36})\.[a-f0-9]{64})$/.exec(value);
  if (!m) throw new ApiError("UNAUTHENTICATED", 401);
  const actual = Buffer.from(m[1]),
    expected = Buffer.from(demoToken(secret, m[2]));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new ApiError("UNAUTHENTICATED", 401);
  return m[2];
}
export function registerDemo(
  app: FastifyInstance,
  pool: Pool,
  secret: string,
  storeId?: string,
  personal = false,
) {
  const shared = new DemoRepository(pool, storeId);
  const repo = personal ? scopedRepository(shared) : shared;
  app.register(
    async (instance) => {
      if (personal)
        instance.addHook("onRequest", (r, _reply, done) => {
          try {
            const isEntry = r.url.split("?")[0].endsWith("/session");
            const identity = isEntry
              ? null
              : personalIdentity(secret, r.headers.authorization ?? "");
            personalScope.run(
              {
                repo: identity
                  ? new PersonalDemoRepository(pool, identity.hash)
                  : shared,
              },
              done,
            );
          } catch (e) {
            done(e as Error);
          }
        });
      const epochOf = (r: FastifyRequest) =>
        personal
          ? personalIdentity(secret, r.headers.authorization ?? "").epoch
          : demoTokenEpoch(secret, r.headers.authorization ?? "");
      const tokenFor = (r: FastifyRequest, epoch: string) =>
        personal
          ? personalToken(
              secret,
              personalIdentity(secret, r.headers.authorization ?? "").hash,
              epoch,
            )
          : demoToken(secret, epoch);
      instance.addHook("onRequest", async (_r, reply) => {
        reply.header("Cache-Control", "no-store");
      });
      const auth = async (r: FastifyRequest) => {
        const epoch = epochOf(r);
        await repo.validateEpoch(epoch);
        return demoUser(epoch);
      };
      const session = async () =>
        repo.withStore((row) => {
          if (!row.starts_at) {
            row.starts_at = new Date();
            row.ends_at = new Date(Date.now() + 48 * 3600000);
          }
          return {
            data: {
              token: demoToken(secret, row.epoch),
              demo: true,
              aiEndsAt: row.ends_at,
            },
          };
        });
      instance.post("/session", async (r) => {
        if (personal) {
          const body = z
            .union([
              z.object({ create: z.literal(true) }).strict(),
              z.object({ code: z.string().max(80) }).strict(),
            ])
            .parse(r.body);
          return {
            data: await personalSession(
              pool,
              secret,
              "code" in body ? body.code : undefined,
            ),
          };
        }
        z.object({})
          .strict()
          .parse(r.body ?? {});
        return session();
      });
      instance.post("/reset", async (r) => {
        z.object({})
          .strict()
          .parse(r.body ?? {});
        const epoch = epochOf(r);
        const next = await repo.reset(epoch);
        return { data: { token: tokenFor(r, next), demo: true } };
      });
      instance.get("/status", async (r) => {
        const id = await auth(r);
        const row = await repo.status(id);
        return {
          data: {
            shared: !personal,
            aiQuotaShared: true,
            aiLimit: 20,
            aiUsed: row.ai_calls.filter((t) => t > Date.now() - 3600000).length,
            aiNextAt: row.ai_calls
              .filter((t) => t > Date.now() - 3600000)
              .sort((a, b) => a - b)[0]
              ? new Date(
                  Math.min(
                    ...row.ai_calls.filter((t) => t > Date.now() - 3600000),
                  ) + 3600000,
                )
              : null,
            aiEndsAt: row.ends_at,
          },
        };
      });
      instance.post<{ Params: { type: string } }>(
        "/daily-rewards/:type/claim",
        async (r) => {
          const id = await auth(r),
            type = z.enum(["attendance", "tip"]).parse(r.params.type);
          z.object({})
            .strict()
            .parse(r.body ?? {});
          const key = IdempotencyKey.parse(r.headers["idempotency-key"]);
          const data = await repo.transaction([id], (states) =>
            once(states[id], key, "reward:" + type, {}, () => {
              const s = states[id],
                claims = (s.claims[seoulDate()] ??= []);
              const awarded = claims.includes(type) ? 0 : ECONOMY_POLICY[type];
              if (awarded) claims.push(type);
              s.balance += awarded;
              return { awarded, balance: s.balance };
            }),
          );
          return { data };
        },
      );
      instance.post("/auth/logout", async (r) => {
        await auth(r);
        return { data: { loggedOut: true } };
      });
      registerPrototype(instance, repo, auth);
    },
    { prefix: personal ? "/web-demo" : "/demo" },
  );
}
