"use client";

/**
 * Lightweight, framework-free bilingual (EN/HI) layer for the whole site.
 *
 * There is no i18n library — strings are co-located with their markup and
 * picked at render time via `t(en, hi)`. A single React context holds the
 * active language so the Header toggle drives every page at once.
 *
 * The choice is persisted per-user in the database (via `/api/auth/preferences`)
 * so it follows a signed-in user across devices, and mirrored to a cookie so
 * anonymous visitors keep their choice on reload. On mount the signed-in user's
 * saved preference (read from `/api/auth/session`) wins over the cookie.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { subscribeSession } from "@/lib/session";

export type Lang = "en" | "hi";

/** Picks the active-language string. Same signature the wizard already used. */
export type Translate = (en: string, hi: string) => string;

const COOKIE_KEY = "bhojpatra-lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Mirror the choice into a cookie so it survives a reload while signed out. */
function writeLangCookie(l: Lang): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_KEY}=${l};path=/;max-age=${COOKIE_MAX_AGE};samesite=lax`;
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: Translate;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLang = "en",
  signedIn = false,
}: {
  children: ReactNode;
  /** Resolved on the server from the language cookie (which login/signup set
   *  from the account's saved preference), so the first paint is already in
   *  the right language — nothing is fetched or swapped after hydration. */
  initialLang?: Lang;
  /** Whether a session cookie is present — a toggle is then also saved to the
   *  account so it follows the user across devices. */
  signedIn?: boolean;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  // Follow the server when it changes its answer (e.g. `router.refresh()`
  // after login picks up the account's language). Adjusting state during
  // render — React's documented pattern for syncing from props.
  const [serverLang, setServerLang] = useState<Lang>(initialLang);
  if (serverLang !== initialLang) {
    setServerLang(initialLang);
    setLangState(initialLang);
  }
  const signedInRef = useRef(signedIn);
  useEffect(() => {
    signedInRef.current = signedIn;
  }, [signedIn]);

  // When the signed-in account changes in this tab (login / signup / logout —
  // all go through the shared session store), adopt that account's saved
  // language. Keyed on the account so a later session refresh can't undo a
  // toggle whose save is still in flight.
  const accountRef = useRef<string | null | undefined>(undefined);
  useEffect(
    () =>
      subscribeSession((session) => {
        if (session === undefined) return;
        const account = session?.email ?? null;
        signedInRef.current = !!session;
        if (account === accountRef.current) return;
        accountRef.current = account;
        if (session?.lang === "en" || session?.lang === "hi") {
          setLangState(session.lang);
          writeLangCookie(session.lang);
        }
      }),
    [],
  );

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    writeLangCookie(l);
    // Persist to the user's record when signed in so it follows them across
    // devices. Anonymous visitors keep the cookie only.
    if (signedInRef.current) {
      void fetch("/api/auth/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: l }),
      }).catch(() => {});
    }
  }, []);

  const toggle = useCallback(
    () => setLang(lang === "en" ? "hi" : "en"),
    [lang, setLang],
  );

  const t = useCallback<Translate>(
    (en, hi) => (lang === "hi" ? hi : en),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLang must be used within a <LanguageProvider>");
  }
  return ctx;
}
