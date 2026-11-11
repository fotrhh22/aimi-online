// Fixed upstream and an explicit demo allowlist; never a general-purpose proxy.
const upstream = "https://aimi-online-api.onrender.com";
const routes = [
  ["POST", /^\/demo\/daily-rewards\/(attendance|tip)\/claim$/],
  ["POST", /^\/demo\/(session|reset|auth\/logout)$/],
  ["GET", /^\/demo\/status$/],
  ["GET", /^\/demo\/v1\/(state|content|content\/previews|social|models)$/],
  [
    "POST",
    /^\/demo\/v1\/(game-plays|challenge\/(preview|count-hint|attempts)|purchases|social\/actions|optimizer\/jobs|recommendations)$/,
  ],
  [
    "GET",
    /^\/demo\/v1\/(game-plays|attempts|optimizer\/jobs)\/[A-Za-z0-9_-]+$/,
  ],
  [
    "POST",
    /^\/demo\/v1\/(game-plays\/[A-Za-z0-9_-]+\/complete|attempts\/[A-Za-z0-9_-]+\/reward)$/,
  ],
  ["GET", /^\/demo\/v1\/friends\/[A-Za-z0-9_-]+\/garden$/],
  ["PUT", /^\/demo\/v1\/(garden|profile)$/],
  ["DELETE", /^\/demo\/v1\/account$/],
];
export const config = { maxDuration: 60 };
export async function proxyDemo(request, send, fetchUpstream = fetch) {
  send.setHeader("Cache-Control", "no-store");
  const error = (status, code) => send.status(status).json({ error: { code } });
  const method = request.method || "GET";
  // Resolve the explicit rewrite capture, or the original pathname during local QA.
  const url = new URL(request.url, "https://demo.invalid");
  const path = url.searchParams.has("__demo_path")
    ? "/" + url.searchParams.get("__demo_path")
    : url.pathname.replace(/^\/api/, "");
  if (
    !routes.some(
      ([m, re]) =>
        method === m && re.test(path.replace(/^\/web-demo(?=\/)/, "/demo")),
    )
  )
    return error(404, "NOT_FOUND");
  const auth = request.headers.authorization;
  if (
    auth &&
    (typeof auth !== "string" ||
      !/^Bearer (?:demo\.[a-f0-9-]{36}|guest\.[a-f0-9]{64}\.[a-f0-9-]{36})\.[a-f0-9]{64}$/.test(
        auth,
      ))
  )
    return error(401, "UNAUTHENTICATED");
  const headers = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = auth;
  const key = request.headers["idempotency-key"];
  if (typeof key === "string" && key.length <= 200)
    headers["Idempotency-Key"] = key;
  const body = ["POST", "PUT", "DELETE"].includes(method)
    ? JSON.stringify(request.body ?? {})
    : undefined;
  if (body && Buffer.byteLength(body) > 200000)
    return error(413, "INVALID_REQUEST");
  try {
    const response = await fetchUpstream(upstream + path, {
      method,
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(32000),
    });
    if (!response.headers.get("content-type")?.includes("application/json"))
      return error(503, "DEMO_UPSTREAM_UNAVAILABLE");
    const data = await response.json();
    return send.status(response.status).json(data);
  } catch {
    return error(503, "DEMO_UPSTREAM_UNAVAILABLE");
  }
}
export default proxyDemo;
