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

export type Lang = "en" | "hi";

/** Picks the active-language string. Same signature the wizard already used. */
export type Translate = (en: string, hi: string) => string;

const COOKIE_KEY = "bhojpatra-lang";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** Read the language cookie (anonymous / SSR-friendly device default). */
function readLangCookie(): Lang | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)bhojpatra-lang=(en|hi)\b/);
  return match ? (match[1] as Lang) : null;
}

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

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server + first client render are always "en" so hydration matches; the
  // saved preference is applied in an effect right after mount.
  const [lang, setLangState] = useState<Lang>("en");
  // Whether a signed-in user's preference should be persisted to the DB. Set
  // once the session resolves so an anonymous toggle only touches the cookie.
  const signedInRef = useRef(false);

  useEffect(() => {
    // 1) Device default from the cookie (covers anonymous visitors).
    const cookieLang = readLangCookie();
    if (cookieLang) setLangState(cookieLang);

    // 2) The signed-in user's saved preference is the source of truth — it
    //    overrides the cookie once the session resolves.
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { user?: { lang?: Lang } | null } | null) => {
        if (!active) return;
        const user = json?.user ?? null;
        signedInRef.current = !!user;
        if (user?.lang === "en" || user?.lang === "hi") {
          setLangState(user.lang);
          writeLangCookie(user.lang);
        }
      })
      .catch(() => {
        /* offline — keep the cookie/default choice */
      });
    return () => {
      active = false;
    };
  }, []);

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
