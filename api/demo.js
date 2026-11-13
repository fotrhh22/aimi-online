// Vercel demo retired. No forwarding, credentials, DB access or Gemini calls.
export const config = { maxDuration: 5 };
export async function proxyDemo(_request, send) {
  send.setHeader("Cache-Control", "no-store");
  return send.status(410).json({ error: { code: "WEB_DEMO_CLOSED" } });
}
export default proxyDemo;
