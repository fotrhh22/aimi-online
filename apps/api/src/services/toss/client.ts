import https from "node:https";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { ApiError } from "../../db.js";

export function partnerError(response: { error?: { errorCode?: string } }) {
  if (response.error?.errorCode === "4011")
    return new ApiError("TOSS_AUTH_CODE_INVALID", 400);
  if (response.error?.errorCode === "4095")
    return new ApiError("TOSS_AUTH_RATE_LIMITED", 429);
  return new ApiError("TOSS_AUTH_FAILED", 502);
}
export function preserveUserKey(raw: string) {
  return raw.replace(/("userKey"\s*:\s*)(\d+)(?=\s*[,}])/g, '$1"$2"');
}
export function tossPartnerRequest(
  path: string,
  method: string,
  body: unknown,
  token?: string,
): Promise<unknown> {
  const cert = process.env.TOSS_CLIENT_CERT_PATH,
    key = process.env.TOSS_CLIENT_KEY_PATH;
  if (!cert || !key) throw new ApiError("TOSS_AUTH_NOT_CONFIGURED", 503);
  let payload = body === undefined ? undefined : JSON.stringify(body);
  if (path.endsWith("/access/remove-by-user-key")) {
    const userKey = z
      .string()
      .regex(/^\d{1,20}$/)
      .parse((body as { userKey: string }).userKey);
    payload = '{"userKey":' + userKey + "}";
  }
  return new Promise((resolve, reject) => {
    let req: import("node:http").ClientRequest;
    try {
      req = https.request(
        {
          hostname: "apps-in-toss-api.toss.im",
          path,
          method,
          cert: readFileSync(cert),
          key: readFileSync(key),
          rejectUnauthorized: true,
          timeout: 15000,
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: "Bearer " + token } : {}),
            ...(payload
              ? { "Content-Length": Buffer.byteLength(payload) }
              : {}),
          },
        },
        (res) => {
          let buffer = "";
          res.on("error", () =>
            reject(new ApiError("TOSS_AUTH_UNAVAILABLE", 503)),
          );
          res.on("aborted", () =>
            reject(new ApiError("TOSS_AUTH_UNAVAILABLE", 503)),
          );
          res.on("data", (chunk: Buffer) => {
            buffer += chunk.toString("utf8");
            if (buffer.length > 200000) {
              reject(new ApiError("TOSS_AUTH_FAILED", 502));
              req.destroy();
            }
          });
          res.on("end", () => {
            try {
              const r = JSON.parse(preserveUserKey(buffer));
              if (res.statusCode !== 200 || r.resultType !== "SUCCESS")
                return reject(partnerError(r));
              resolve(r.success);
            } catch {
              reject(new ApiError("TOSS_AUTH_FAILED", 502));
            }
          });
        },
      );
    } catch {
      return reject(new ApiError("TOSS_AUTH_NOT_CONFIGURED", 503));
    }
    req.on("timeout", () => {
      reject(new ApiError("TOSS_AUTH_UNAVAILABLE", 503));
      req.destroy();
    });
    req.on("error", () => reject(new ApiError("TOSS_AUTH_UNAVAILABLE", 503)));
    if (payload) req.write(payload);
    req.end();
  });
}
