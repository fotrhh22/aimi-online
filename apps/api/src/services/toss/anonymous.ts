import { createHmac, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import { AnonymousLogin, SessionResult } from "@aimi/contracts";
import { z } from "zod";
import { ApiError } from "../../db.js";
import { tossPartnerRequest } from "./client.js";

const exchangePath = "/api-partner/v1/apps-in-toss/users/anon-key/exchange";
const Identity = z.object({ anonKey: z.string().min(1).max(2048) });
export async function exchangeAnonymousCode(code: string) {
  const response = await tossPartnerRequest(exchangePath, "POST", { code });
  const parsed = Identity.safeParse(response);
  if (!parsed.success) throw new ApiError("TOSS_AUTH_FAILED", 502);
  return parsed.data.anonKey;
}

// Dependency injection is server-side only, for isolated tests. No HTTP bypass.
export function registerAnonymousAuth(
  app: FastifyInstance,
  pool: Pool,
  secret: string,
  exchange: (code: string) => Promise<string> = exchangeAnonymousCode,
) {
  app.post("/auth/anonymous", async (request) => {
    const { code } = AnonymousLogin.parse(request.body);
    const verifiedKey = await exchange(code);
    if (!Identity.safeParse({ anonKey: verifiedKey }).success)
      throw new ApiError("TOSS_AUTH_FAILED", 502);
    const identity = createHmac("sha256", secret)
      .update("toss-anon:" + verifiedKey)
      .digest("hex");
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHmac("sha256", secret).update(token).digest("hex");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "INSERT INTO aimi.users(toss_anon_key) VALUES($1) ON CONFLICT(toss_anon_key) DO UPDATE SET toss_anon_key=excluded.toss_anon_key RETURNING id",
        [identity],
      );
      const uid = result.rows[0].id;
      await client.query(
        "INSERT INTO aimi.ep_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING",
        [uid],
      );
      await client.query(
        "INSERT INTO aimi.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
        [tokenHash, uid],
      );
      await client.query("COMMIT");
      return { data: SessionResult.parse({ token, expiresIn: 3600 }) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  });
}
