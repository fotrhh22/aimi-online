import { request, setToken, token } from "./api/client";
export const testDemoEnabled = import.meta.env.VITE_TEST_DEMO === "true";
export const isDemoSession = () =>
  testDemoEnabled && !!token()?.startsWith("demo.");
let pendingSession: Promise<void> | undefined;
export function startTestDemo() {
  if (!pendingSession)
    pendingSession = createTestSession().finally(() => {
      pendingSession = undefined;
    });
  return pendingSession;
}
async function createTestSession() {
  const result = await request<{ token: string }>("/demo/session", "POST", {});
  setToken(result.token);
}
export async function resetTestDemo() {
  const result = await request<{ token: string }>("/demo/reset", "POST", {});
  setToken(null);
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith("aimi.")) sessionStorage.removeItem(key);
  setToken(result.token);
}
