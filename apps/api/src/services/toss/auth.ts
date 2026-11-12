import {
  createHash,
  createHmac,
  randomBytes,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import type { Pool } from "pg";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { ApiError } from "../../db.js";
type Tokens = { userKey: string; accessToken: string; refreshToken: string };
const prefix = "/api-partner/v1/apps-in-toss/user/oauth2/";
export { preserveUserKey } from "./client.js";
import { tossPartnerRequest, preserveUserKey } from "./client.js";
export function tossClient(
  path: string,
  method: string,
  body: unknown,
  token?: string,
) {
  return tossPartnerRequest(prefix + path, method, body, token);
}
export function registerTossAuth(
  app: FastifyInstance,
  pool: Pool,
  secret: string,
  auth: (r: FastifyRequest) => Promise<string>,
) {
  const tokenHash = (t: string) =>
    createHmac("sha256", secret).update(t).digest("hex");
  const userHash = (t: string) =>
    createHmac("sha256", secret)
      .update("toss-user:" + t)
      .digest("hex");
  const encKey = createHash("sha256")
    .update("aimi-toss-connections:" + secret)
    .digest();
  const seal = (value: Tokens) => {
    const iv = randomBytes(12),
      cipher = createCipheriv("aes-256-gcm", encKey, iv),
      content = Buffer.concat([
        cipher.update(JSON.stringify(value), "utf8"),
        cipher.final(),
      ]);
    return Buffer.concat([iv, cipher.getAuthTag(), content]).toString("base64");
  };
  const open = (value: string): Tokens => {
    const b = Buffer.from(value, "base64"),
      cipher = createDecipheriv("aes-256-gcm", encKey, b.subarray(0, 12));
    cipher.setAuthTag(b.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([cipher.update(b.subarray(28)), cipher.final()]).toString(
        "utf8",
      ),
    );
  };
  const issue = async (uid: string) => {
    const token = randomBytes(32).toString("hex");
    await pool.query(
      "INSERT INTO aimi.sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
      [tokenHash(token), uid],
    );
    return { data: { token, expiresIn: 3600 } };
  };
  app.post("/auth/toss", async (r) => {
    const b = z
      .object({
        authorizationCode: z.string().min(1).max(2048),
        referrer: z.string().max(100),
      })
      .strict()
      .parse(r.body);
    const tokens = z
      .object({ accessToken: z.string(), refreshToken: z.string() })
      .parse(await tossClient("generate-token", "POST", b));
    const raw = (await tossClient(
      "login-me",
      "GET",
      undefined,
      tokens.accessToken,
    )) as { userKey: unknown };
    if (
      !["string", "number"].includes(typeof raw.userKey) ||
      (typeof raw.userKey === "number" && !Number.isSafeInteger(raw.userKey))
    )
      throw new ApiError("TOSS_ID_INVALID", 502);
    const userKey = String(raw.userKey),
      c = await pool.connect();
    let uid: string;
    try {
      await c.query("BEGIN");
      const result = await c.query(
        "INSERT INTO aimi.users(toss_user_key) VALUES($1) ON CONFLICT(toss_user_key) DO UPDATE SET toss_user_key=excluded.toss_user_key RETURNING id",
        [userHash(userKey)],
      );
      uid = result.rows[0].id;
      await c.query(
        "INSERT INTO aimi.ep_wallets(user_id) VALUES($1) ON CONFLICT DO NOTHING",
        [uid],
      );
      await c.query(
        "INSERT INTO aimi.toss_connections(user_id,sealed) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET sealed=excluded.sealed",
        [uid, seal({ ...tokens, userKey })],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    return issue(uid);
  });
  app.post("/auth/refresh", async (r) => {
    const uid = await auth(r),
      conn = await pool.query(
        "SELECT sealed FROM aimi.toss_connections WHERE user_id=$1",
        [uid],
      );
    if (!conn.rowCount) throw new ApiError("UNAUTHENTICATED", 401);
    const old = open(conn.rows[0].sealed),
      fresh = z
        .object({ accessToken: z.string(), refreshToken: z.string() })
        .parse(
          await tossClient("refresh-token", "POST", {
            refreshToken: old.refreshToken,
          }),
        );
    await pool.query(
      "UPDATE aimi.toss_connections SET sealed=$2 WHERE user_id=$1",
      [uid, seal({ ...fresh, userKey: old.userKey })],
    );
    const result = await issue(uid);
    await pool.query("DELETE FROM aimi.sessions WHERE token_hash=$1", [
      tokenHash(r.headers.authorization!.slice(7)),
    ]);
    return result;
  });
  app.register(async (callbackApp) => {
    callbackApp.removeContentTypeParser("application/json");
    const parse = callbackApp.getDefaultJsonParser("error", "error");
    callbackApp.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (request, body, done) =>
        parse(request, preserveUserKey(body as string), done),
    );
    callbackApp.post("/auth/toss/unlink-callback", async (r) => {
      const configured = process.env.TOSS_UNLINK_BASIC_AUTH,
        header = r.headers.authorization ?? "";
      if (
        !configured ||
        header.length !== configured.length ||
        !timingSafeEqual(Buffer.from(header), Buffer.from(configured))
      )
        throw new ApiError("UNAUTHENTICATED", 401);
      const b = z
        .object({
          userKey: z.union([z.string(), z.number().int().safe()]),
          referrer: z.enum(["UNLINK", "WITHDRAWAL_TERMS", "WITHDRAWAL_TOSS"]),
        })
        .parse(r.body);
      await pool.query(
        "DELETE FROM aimi.sessions WHERE user_id IN(SELECT id FROM aimi.users WHERE toss_user_key=$1)",
        [userHash(String(b.userKey))],
      );
      await pool.query(
        "DELETE FROM aimi.toss_connections WHERE user_id IN(SELECT id FROM aimi.users WHERE toss_user_key=$1)",
        [userHash(String(b.userKey))],
      );
      return { data: { ok: true } };
    });
  });
  return async (uid: string) => {
    const r = await pool.query(
      "SELECT sealed FROM aimi.toss_connections WHERE user_id=$1",
      [uid],
    );
    if (r.rowCount) {
      const conn = open(r.rows[0].sealed);
      await tossClient("access/remove-by-user-key", "POST", {
        userKey: conn.userKey,
      });
    }
  };
}
