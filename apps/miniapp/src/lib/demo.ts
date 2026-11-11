import { request, setToken, token, webDemoRuntime } from "./api/client";
export const testDemoEnabled = import.meta.env.VITE_TEST_DEMO === "true";
export const isDemoSession = () =>
  testDemoEnabled &&
  !!(token()?.startsWith("demo.") || token()?.startsWith("guest."));
let pendingSession: Promise<void> | undefined;
export function startTestDemo(code?: string) {
  if (!pendingSession)
    pendingSession = createTestSession(code).finally(() => {
      pendingSession = undefined;
    });
  return pendingSession;
}
export const accessCodeKey = "aimi.web-demo.access-code";
export async function issueAccessCode() {
  if (!webDemoRuntime) throw Error("WEB_DEMO_ONLY");
  const result = await request<{ accessCode: string }>(
    "/demo/session",
    "POST",
    { create: true },
  );
  return result.accessCode;
}
async function createTestSession(code?: string) {
  if (webDemoRuntime && !code) throw Error("INVALID_ACCESS_CODE");
  const result = await request<{ token: string; accessCode?: string }>(
    "/demo/session",
    "POST",
    webDemoRuntime ? { code } : {},
  );
  if (webDemoRuntime)
    localStorage.setItem(accessCodeKey, result.accessCode ?? code!);
  setToken(result.token);
}
export async function resetTestDemo() {
  const result = await request<{ token: string }>("/demo/reset", "POST", {});
  setToken(null);
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith("aimi.")) sessionStorage.removeItem(key);
  setToken(result.token);
}
