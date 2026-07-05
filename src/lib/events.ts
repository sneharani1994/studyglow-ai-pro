import { useEffect } from "react";

/**
 * Lightweight app-wide event bus so pages (e.g. the Dashboard) can refetch
 * whenever the user creates/updates data elsewhere in the app — no page
 * reload required.
 */
export const APP_REFRESH_EVENT = "studygpt-app-refresh";

export type AppRefreshDetail = {
  source?:
    | "chat"
    | "notes"
    | "summaries"
    | "flashcards"
    | "quizzes"
    | "planner"
    | "roadmap"
    | "uploads"
    | "ai"
    | "profile"
    | "other";
};

export function emitAppRefresh(detail: AppRefreshDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(APP_REFRESH_EVENT, { detail }));
}

/** Subscribe to app-refresh events. Also re-fires on window focus / visibility. */
export function useAppRefresh(handler: (detail: AppRefreshDetail) => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<AppRefreshDetail>).detail ?? {};
      handler(detail);
    };
    const onFocus = () => handler({ source: "other" });
    const onVisibility = () => {
      if (document.visibilityState === "visible") handler({ source: "other" });
    };
    window.addEventListener(APP_REFRESH_EVENT, onEvent);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(APP_REFRESH_EVENT, onEvent);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // handler intentionally captured once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}