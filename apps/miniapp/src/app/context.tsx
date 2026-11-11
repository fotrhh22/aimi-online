import { parentRoute, navigationTrail } from "./navigation";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type {
  DailyTip,
  Attempt,
  CatalogItem,
  DailyProgress,
  Keyword,
  Play,
  UserState,
} from "@aimi/contracts";
import {
  request,
  token,
  setToken,
  errorText,
  localRuntime,
} from "../lib/api/client";
import { hostNavigation, updateNavigation, exit } from "../lib/toss/bridge";
export type HomeState = {
  todayTip: DailyTip;
  challengeRemaining?: number;
  name: string;
  code: string;
  balance: number;
  character: string;
  inventory: string[];
  garden: UserState["garden"];
  daily: DailyProgress;
  budget: number;
  claims: string[];
  activePlay: Play | null;
  latestAttempt: Attempt | null;
  pendingChallengeReward?: Attempt | null;
  challengeAttempts?: Attempt[];
};
export type Content = {
  ruleVersion?: string;
  answerCount?: number;
  reviewStatus?: string;
  generationModel?: string;

  version: string;
  title: string;
  target: string;
  keywords: Keyword[];
  catalog: CatalogItem[];
  developmentSample: boolean;
};
const Context = createContext<ReturnType<typeof useAppState> | null>(null);
function useAppState() {
  const [path, setPath] = useState(() => {
    // A fresh app load starts at home; invite query was captured by the API client.
    history.replaceState({ ...history.state, aimiNavigation: { index: 0, trail: ["/"] } }, "", "/" + location.search);
    return "/";
  }),
    [data, setData] = useState<HomeState | null>(null),
    [content, setContent] = useState<Content | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [busy, setBusy] = useState(false),
    [authenticated, setAuthenticated] = useState(Boolean(token())),
    [aiEpoch, setAIEpoch] = useState(0);
  const guard = useRef<((next: string) => boolean) | null>(null),
    currentPath = useRef(path);
  currentPath.current = path;
  const blockNavigation = useCallback(
    (fn: ((next: string) => boolean) | null) => {
      guard.current = fn;
    },
    [],
  );
  const nav = useRef<{ index: number; trail: string[] }>(
    history.state?.aimiNavigation ?? {
      index: 0,
      trail: path === "/" ? ["/"] : navigationTrail(["/"], path),
    },
  );
  const backHandlers = useRef(new Map<string, () => boolean>());
  const writeLocks = useRef(0);
  const restorePop = useRef(false);
  const scrollPositions = useRef(new Map<string, number>());
  const registerBackHandler = useCallback(
    (route: string, fn: () => boolean) => {
      backHandlers.current.set(route, fn);
      return () => {
        if (backHandlers.current.get(route) === fn)
          backHandlers.current.delete(route);
      };
    },
    [],
  );
  const commit = useCallback(
    (next: string, trail: string[], replace = true) => {
      if (!replace) nav.current.index++;
      nav.current.trail = trail;
      const snapshot = {
        ...history.state,
        aimiNavigation: { index: nav.current.index, trail },
      };
      if (replace) history.replaceState(snapshot, "", next);
      else history.pushState(snapshot, "", next);
      scrollPositions.current.set(currentPath.current, window.scrollY ?? 0);
      currentPath.current = next;
      setPath(next);
      requestAnimationFrame(() =>
        window.scrollTo(0, scrollPositions.current.get(next) ?? 0),
      );
    },
    [],
  );
  const locked = useCallback(() => {
    if (!writeLocks.current) return false;
    setToast("처리 중이에요. 완료될 때까지 잠시 기다려주세요.");
    return true;
  }, []);
  const closeBackLayer = useCallback(() => {
    const dialogs =
      document.querySelectorAll<HTMLDialogElement>("dialog[open]");
    const top = dialogs[dialogs.length - 1];
    if (top) {
      top.dispatchEvent(new Event("cancel", { cancelable: true }));
      return true;
    }
    return backHandlers.current.get(currentPath.current)?.() ?? false;
  }, []);
  const navigate = useCallback(
    (next: string, options?: { replace?: boolean }) => {
      if (next === currentPath.current || locked()) return;
      if (guard.current && !guard.current(next)) return;
      const trail = navigationTrail(nav.current.trail, next, options?.replace);
      // Tabs, finished attempts and existing destinations don't accumulate duplicate history.
      const replace =
        options?.replace ||
        nav.current.trail.includes(next) ||
        (currentPath.current.startsWith("/models/") &&
          next.startsWith("/models/")) ||
        ["/", "/mission", "/garden", "/social"].includes(next);
      commit(next, trail, Boolean(replace));
    },
    [commit, locked],
  );
  const back = useCallback(() => {
    if (locked() || closeBackLayer()) return;
    const target = parentRoute(currentPath.current, nav.current.trail);
    if (target === null) {
      exit();
      return;
    }
    if (guard.current && !guard.current(target)) return;
    commit(target, navigationTrail(nav.current.trail, target));
  }, [commit, locked, closeBackLayer]);
  const isCurrentPath = useCallback(
    (route: string) => currentPath.current === route,
    [],
  );
  useEffect(() => {
    if (!history.state?.aimiNavigation) {
      // A direct detail URL also needs an in-app back entry, rather than leaving the app.
      if (currentPath.current !== "/") {
        history.replaceState(
          { aimiNavigation: { index: 0, trail: ["/"] } },
          "",
          "/",
        );
        nav.current.index = 1;
        history.pushState(
          { aimiNavigation: nav.current },
          "",
          currentPath.current,
        );
      } else
        history.replaceState(
          { aimiNavigation: nav.current },
          "",
          currentPath.current,
        );
    }
    const listener = (event: PopStateEvent) => {
      if (restorePop.current) {
        restorePop.current = false;
        return;
      }
      const incoming = event.state?.aimiNavigation;
      const delta =
        (incoming?.index ?? nav.current.index - 1) - nav.current.index;
      const restore = () => {
        if (delta !== 0 && incoming) {
          restorePop.current = true;
          history.go(-delta);
        } else
          history.replaceState(
            { aimiNavigation: nav.current },
            "",
            currentPath.current,
          );
      };
      if (locked()) {
        restore();
        return;
      }
      const beforeLayer = currentPath.current;
      if (closeBackLayer()) {
        if (currentPath.current !== beforeLayer) {
          nav.current.index =
            incoming?.index ?? Math.max(0, nav.current.index - 1);
          commit(currentPath.current, nav.current.trail);
        } else restore();
        return;
      }
      const next = location.pathname + location.search;
      if (delta > 0) {
        if (guard.current && !guard.current(next)) {
          restore();
          return;
        }
        scrollPositions.current.set(currentPath.current, window.scrollY ?? 0);
        nav.current = { index: incoming.index, trail: incoming.trail };
        currentPath.current = next;
        setPath(next);
        requestAnimationFrame(() =>
          window.scrollTo(0, scrollPositions.current.get(next) ?? 0),
        );
        return;
      }
      const target = parentRoute(currentPath.current, nav.current.trail);
      if (target === null) {
        exit();
        restore();
        return;
      }
      if (guard.current && !guard.current(target)) {
        restore();
        return;
      }
      nav.current.index = incoming?.index ?? Math.max(0, nav.current.index - 1);
      commit(target, navigationTrail(nav.current.trail, target));
    };
    const writing = () => {
      writeLocks.current++;
    };
    const written = () => {
      writeLocks.current = Math.max(0, writeLocks.current - 1);
    };
    const unloading = (e: BeforeUnloadEvent) => {
      if (writeLocks.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("aimi-write-start", writing);
    window.addEventListener("aimi-write-end", written);
    window.addEventListener("beforeunload", unloading);
    window.addEventListener("popstate", listener);
    const clean = hostNavigation(back);
    return () => {
      window.removeEventListener("aimi-write-start", writing);
      window.removeEventListener("aimi-write-end", written);
      window.removeEventListener("beforeunload", unloading);
      window.removeEventListener("popstate", listener);
      clean();
    };
  }, [back, commit, closeBackLayer, locked]);
  useEffect(() => updateNavigation(path !== "/"), [path]);
  useEffect(() => {
    const clearAI = () => {
      for (const key of Object.keys(sessionStorage))
        if (/^aimi\.(optimizer|recommendation|model)\./.test(key))
          sessionStorage.removeItem(key);
      if (["/optimizer", "/recommendations"].includes(currentPath.current))
        setBusy(false);
      setAIEpoch((n) => n + 1);
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") clearAI();
    };
    const restored = (e: PageTransitionEvent) => {
      if (e.persisted) clearAI();
    };
    // Drop caches from older versions, including a retained optimizer job.
    for (const key of Object.keys(sessionStorage))
      if (
        /^aimi\.optimizer\./.test(key) ||
        key === "aimi.recommendation.result"
      )
        sessionStorage.removeItem(key);
    window.addEventListener("pagehide", clearAI);
    window.addEventListener("pageshow", restored);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("pagehide", clearAI);
      window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const refresh = useCallback(async () => {
    if (!token()) {
      setLoading(false);
      return;
    }
    try {
      const [s, c] = await Promise.all([
        request<HomeState>("/v1/state"),
        request<Content>("/v1/content"),
      ]);
      setData(s);
      setContent(c);
      setError("");
      setAuthenticated(true);
    } catch (e) {
      setError(errorText(e));
      if ((e as { status?: number }).status === 401) {
        setToken(null);
        setAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    if (!data) return;
    const rollover = Date.parse(data.daily.date + "T00:00:00+09:00") + 86400000;
    const refreshIfNewDay = () => {
      if (document.visibilityState === "visible" && Date.now() >= rollover)
        void refresh();
    };
    const timer = setTimeout(
      () => void refresh(),
      Math.max(1000, rollover - Date.now() + 100),
    );
    window.addEventListener("focus", refreshIfNewDay);
    document.addEventListener("visibilitychange", refreshIfNewDay);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refreshIfNewDay);
      document.removeEventListener("visibilitychange", refreshIfNewDay);
    };
  }, [data?.daily.date, refresh]);

  useEffect(() => {
    const expired = () => {
      setAuthenticated(false);
      setData(null);
      setContent(null);
      setLoading(false);
      setError("");
    };
    window.addEventListener("aimi-session-expired", expired);
    return () => window.removeEventListener("aimi-session-expired", expired);
  }, []);
  const perform = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      message?: string,
    ): Promise<T | undefined> => {
      setBusy(true);
      try {
        const result = await fn();
        await refresh();
        if (message) setToast(message);
        return result;
      } catch (e) {
        setToast(errorText(e));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );
  return {
    path,
    aiEpoch,
    navigate,
    back,
    blockNavigation,
    registerBackHandler,
    isCurrentPath,
    data,
    content,
    loading,
    error,
    toast,
    setToast,
    busy,
    perform,
    refresh,
    authenticated,
    setAuthenticated,
    localRuntime,
  };
}
export function AppProvider({ children }: { children: React.ReactNode }) {
  const value = useAppState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("AppProvider missing");
  return ctx;
}
