import { tossRuntime } from "./runtime";
import { lockedViewport } from "./scale-policy";
/** Installed Toss only: keep one scale without interfering with single-finger input. */
export function installScaleLock() {
  if (!tossRuntime) return () => {};
  document
    .querySelector<HTMLMetaElement>('meta[name="viewport"]')
    ?.setAttribute("content", lockedViewport);
  const gesture = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };
  const multiple = (e: TouchEvent) => {
    if (e.touches.length > 1 && e.cancelable) e.preventDefault();
  };
  const options = { passive: false };
  document.addEventListener("gesturestart", gesture, options);
  document.addEventListener("gesturechange", gesture, options);
  document.addEventListener("gestureend", gesture, options);
  document.addEventListener("touchstart", multiple, options);
  document.addEventListener("touchmove", multiple, options);
  return () => {
    document.removeEventListener("gesturestart", gesture);
    document.removeEventListener("gesturechange", gesture);
    document.removeEventListener("gestureend", gesture);
    document.removeEventListener("touchstart", multiple);
    document.removeEventListener("touchmove", multiple);
  };
}
