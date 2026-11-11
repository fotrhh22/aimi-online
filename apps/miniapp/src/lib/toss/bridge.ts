import {
  TossAuth,
  NavigationBar,
  graniteEvent,
  closeView,
  getTossShareLink,
  share,
  setClipboardText,
} from "@apps-in-toss/web-framework";
import { localRuntime, request, setToken } from "../api/client";
export async function login(name = "player") {
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
  if (localRuntime) await navigator.clipboard.writeText(text);
  else await setClipboardText(text);
}
export async function invite(code: string) {
  if (localRuntime) {
    await copy(location.origin + "/?invite=" + encodeURIComponent(code));
    return;
  }
  const link = await getTossShareLink(
    "intoss://aimi/?invite=" + encodeURIComponent(code),
  );
  await share({ message: "AIMI에서 함께 정원을 꾸며요! " + link });
}
export function hostNavigation(back: () => void) {
  if (localRuntime) return () => {};
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
  if (!localRuntime)
    void NavigationBar.setOptions({
      withBackButton: hasBack,
      withHomeButton: false,
      withTitle: false,
      transparentBackground: true,
      theme: "light",
    }).catch(() => {});
}
export function exit() {
  if (!localRuntime) void closeView();
}
