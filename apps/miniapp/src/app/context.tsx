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
  const [path, setPath] = useState(location.pathname),
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
  const navigate = useCallback(
    (next: string, options?: { replace?: boolean }) => {
      if (guard.current && !guard.current(next)) return;
      if (options?.replace) history.replaceState({}, "", next);
      else history.pushState({}, "", next);
      setPath(next);
      window.scrollTo(0, 0);
    },
    [],
  );
  const back = useCallback(() => {
    const dialog = document.querySelector("dialog[open]");
    if (dialog) {
      dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
      return;
    }
    if (location.pathname === "/") {
      exit();
      return;
    }
    if (guard.current && !guard.current("/garden")) return;
    if (["/garden", "/mission", "/social"].includes(location.pathname)) {
      history.replaceState({}, "", "/");
      setPath("/");
      window.scrollTo(0, 0);
      return;
    }
    history.back();
  }, []);
  useEffect(() => {
    const listener = () => {
      const next = location.pathname + location.search;
      if (guard.current && !guard.current(next)) {
        history.pushState({}, "", currentPath.current);
        return;
      }
      setPath(next);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", listener);
    const clean = hostNavigation(back);
    return () => {
      window.removeEventListener("popstate", listener);
      clean();
    };
  }, [back]);
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
