import { request, setToken, token } from "./api/client";
export const testDemoEnabled = import.meta.env.VITE_TEST_DEMO === "true";
export const isDemoSession = () =>
  testDemoEnabled && !!token()?.startsWith("demo.");
export async function startTestDemo() {
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
