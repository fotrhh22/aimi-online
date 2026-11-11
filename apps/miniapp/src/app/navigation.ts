import { challengeBackTarget } from "../features/challenge/view-state";
const tabs = new Set(["/", "/mission", "/garden", "/social"]);
export function parentRoute(path: string, trail: string[]): string | null {
  if (path === "/") return null;
  const challenge = challengeBackTarget(path);
  if (challenge) return challenge;
  if (path.startsWith("/results/game/")) return "/";
  if (path.startsWith("/game")) return "/mission";
  if (path === "/garden/edit" || path.startsWith("/shop/")) return "/garden";
  if (path.startsWith("/friends/")) return "/social";
  if (tabs.has(path)) return "/";
  if (path.startsWith("/models/")) {
    if (trail.some((p) => p.startsWith("/challenge"))) return "/";
    return (
      [...trail]
        .reverse()
        .find(
          (p) => p !== "/" && p !== "/account" && !p.startsWith("/models/"),
        ) ?? "/recommendations"
    );
  }
  if (path === "/account")
    return [...trail].reverse().find((p) => p !== path) ?? "/";
  if (path === "/recommendations" && trail.includes("/optimizer"))
    return "/optimizer";
  return "/";
}
/** A short product trail, not a list of every button/tier/model the user touched. */
export function navigationTrail(
  trail: string[],
  next: string,
  replace = false,
): string[] {
  if (next === "/") return ["/"];
  if (tabs.has(next)) return ["/", next];
  const existing = trail.lastIndexOf(next);
  if (existing >= 0) return trail.slice(0, existing + 1);
  if (next.startsWith("/results/game/")) return ["/", next];
  if (next.startsWith("/challenge/answer/"))
    return [
      "/",
      "/mission",
      "/challenge/result/" + next.slice("/challenge/answer/".length),
      next,
    ];
  if (next.startsWith("/challenge/result/")) return ["/", "/mission", next];
  if (next.startsWith("/challenge/combination"))
    return ["/", "/mission", "/challenge", next];
  if (next === "/challenge") return ["/", "/mission", next];
  if (next === "/garden/edit" || next.startsWith("/shop/"))
    return ["/", "/garden", next];
  if (next.startsWith("/friends/")) return ["/", "/social", next];
  if (next.startsWith("/models/"))
    return [...trail.filter((p) => !p.startsWith("/models/")), next];
  return [...(replace ? trail.slice(0, -1) : trail), next];
}
