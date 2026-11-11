import {
  TossAuth,
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
} from "../api/client";
export async function login(name = "player") {
  if (webDemoRuntime) throw Error("WEB_DEMO_USES_TEST_SESSION");
  if (localRuntime) {
    const r = await request<{ token: string }>("/auth/local", "POST", { name });
    setToken(r.token);
    return;
  }
  const credential = await TossAuth.login();
  const r = await request<{ token: string }>("/auth/toss", "POST", credential);
  setToken(r.token);
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
  if (!browserRuntime)
    void NavigationBar.setOptions({
      withBackButton: hasBack,
      withHomeButton: false,
      withTitle: false,
      transparentBackground: true,
      theme: "light",
    }).catch(() => {});
}
export function exit() {
  if (!browserRuntime) void closeView();
}
