import { SafeArea } from "@apps-in-toss/web-framework";
import { tossRuntime } from "./runtime";
import { normalizedInsets } from "./safe-area-policy";
/** Set all four insets before React paints, then follow host/orientation/viewport changes. */
export function installSafeArea() {
  const root = document.documentElement;
  const host = tossRuntime;
  root.dataset.aimiHost = host ? "toss" : "browser";
  const apply = (raw: unknown) => {
    const insets = normalizedInsets(raw);
    for (const [side, value] of Object.entries(insets))
      root.style.setProperty("--sdk-safe-" + side, value + "px");
  };
  const read = () => {
    if (host) {
      try {
        apply(SafeArea.get());
      } catch {
        /* CSS env fallback stays active. */
      }
    }
  };
  const viewport = () => {
    const visual = window.visualViewport;
    root.style.setProperty(
      "--visual-viewport-height",
      (visual?.height ?? window.innerHeight) + "px",
    );
    root.style.setProperty(
      "--visual-viewport-top",
      (visual?.offsetTop ?? 0) + "px",
    );
    const editing = document.activeElement?.matches(
      "input,textarea,[contenteditable=true]",
    );
    root.dataset.keyboard =
      editing &&
      Math.max(root.clientHeight, window.innerHeight) -
        (visual?.height ?? window.innerHeight) >
        120
        ? "open"
        : "closed";
  };
  read();
  viewport();
  let unsubscribe = () => {};
  if (host) {
    try {
      unsubscribe = SafeArea.subscribe({ onEvent: apply });
    } catch {}
  }
  const refresh = () => {
    read();
    viewport();
  };
  window.addEventListener("resize", refresh);
  window.addEventListener("orientationchange", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("focusin", viewport);
  document.addEventListener("focusout", viewport);
  window.visualViewport?.addEventListener("resize", viewport);
  window.visualViewport?.addEventListener("scroll", viewport);
  return () => {
    unsubscribe();
    window.removeEventListener("resize", refresh);
    window.removeEventListener("orientationchange", refresh);
    window.removeEventListener("pageshow", refresh);
    document.removeEventListener("focusin", viewport);
    document.removeEventListener("focusout", viewport);
    window.visualViewport?.removeEventListener("resize", viewport);
    window.visualViewport?.removeEventListener("scroll", viewport);
  };
}
