import {
  User,
  NavigationBar,
  graniteEvent,
  closeView,
  getTossShareLink,
  share,
  setClipboardText,
} from "@apps-in-toss/web-framework";
import {
  localRuntime,
  browserRuntime,
  webDemoRuntime,
  request,
  setToken,
  setAnonymousToken,
  configureSessionRecovery,
  RequestError,
} from "../api/client";
import { AnonymousLogin, SessionResult } from "@aimi/contracts";

async function anonymousCredential() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      User.createAnonymousKeyAuthCode(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new RequestError("TOSS_AUTH_UNAVAILABLE", 0)),
          10000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function anonymousSession() {
  // A rejected/expired code gets one fresh code, never a replay of the old one.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const credential = await anonymousCredential();
      const body = AnonymousLogin.parse({ code: credential.code });
      const result = await request("/auth/anonymous", "POST", body);
      return SessionResult.parse(result).token;
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.code === "TOSS_AUTH_CODE_INVALID" && attempt === 0) continue;
        throw error;
      }
      const code = String(
        (error as { code?: string; message?: string })?.code ??
          (error as Error)?.message ??
          "",
      );
      throw new RequestError(
        code.includes("UNSUPPORTED")
          ? "TOSS_AUTH_UNSUPPORTED"
          : "TOSS_AUTH_FAILED",
        0,
      );
    }
  }
  throw new RequestError("TOSS_AUTH_FAILED", 0);
}
if (!browserRuntime) configureSessionRecovery(anonymousSession);

let pendingLogin: Promise<void> | undefined;
export async function login(name = "player") {
  if (webDemoRuntime) throw Error("WEB_DEMO_USES_TEST_SESSION");
  if (localRuntime) {
    const r = await request<{ token: string }>("/auth/local", "POST", { name });
    setToken(r.token);
    return;
  }
  if (!pendingLogin)
    pendingLogin = anonymousSession()
      .then((value) => setAnonymousToken(value))
      .finally(() => {
        pendingLogin = undefined;
      });
  return pendingLogin;
}
export async function copy(text: string) {
  if (browserRuntime) await navigator.clipboard.writeText(text);
  else await setClipboardText(text);
}
export async function invite(code: string) {
  if (browserRuntime) {
    const url = location.origin + "/?invite=" + encodeURIComponent(code);
    if (webDemoRuntime && navigator.share) {
      try {
        await navigator.share({
          title: "AIMI 테스트",
          text: "AIMI에서 함께 정원을 꾸며요!",
          url,
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") await copy(url);
      }
    } else await copy(url);
    return;
  }
  const link = await getTossShareLink(
    "intoss://aimi/?invite=" + encodeURIComponent(code),
  );
  await share({ message: "AIMI에서 함께 정원을 꾸며요! " + link });
}
export function hostNavigation(back: () => void) {
  if (browserRuntime) return () => {};
  let cleanup = () => {};
  try {
    cleanup = graniteEvent.addEventListener("backEvent", {
      onEvent: back,
      onError: () => {},
    });
  } catch {}
  return cleanup;
}
export function updateNavigation(hasBack: boolean) {
  if (browserRuntime) return;
  try {
    void NavigationBar.setOptions({
      withBackButton: hasBack,
      withHomeButton: false,
      withTitle: false,
      transparentBackground: true,
      theme: "light",
    }).catch(() => {});
  } catch {
    // Unsupported hosts may throw synchronously before returning a Promise.
  }
}
export function exit() {
  if (!browserRuntime) void closeView();
}
