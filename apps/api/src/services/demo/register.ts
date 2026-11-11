import { createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
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
) {
  const repo = new DemoRepository(pool, storeId);
  app.register(
    async (instance) => {
      instance.addHook("onRequest", async (_r, reply) => {
        reply.header("Cache-Control", "no-store");
      });
      const auth = async (r: FastifyRequest) => {
        const epoch = demoTokenEpoch(secret, r.headers.authorization ?? "");
        await repo.transaction([demoUser(epoch)], () => {});
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
        z.object({})
          .strict()
          .parse(r.body ?? {});
        return session();
      });
      instance.post("/reset", async (r) => {
        z.object({})
          .strict()
          .parse(r.body ?? {});
        const epoch = demoTokenEpoch(secret, r.headers.authorization ?? "");
        const next = await repo.reset(epoch);
        return { data: { token: demoToken(secret, next), demo: true } };
      });
      instance.get("/status", async (r) => {
        await auth(r);
        return repo.withStore((row) => ({
          data: {
            shared: true,
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
        }));
      });
      instance.post("/auth/logout", async (r) => {
        await auth(r);
        return { data: { loggedOut: true } };
      });
      registerPrototype(instance, repo, auth);
    },
    { prefix: "/demo" },
  );
}
