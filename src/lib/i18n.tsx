"use client";

/**
 * Lightweight, framework-free bilingual (EN/HI) layer for the whole site.
 *
 * There is no i18n library — strings are co-located with their markup and
 * picked at render time via `t(en, hi)`. A single React context holds the
 * active language so the Header toggle drives every page at once. The choice
 * persists to localStorage and is mirrored onto `<html lang>`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "hi";

/** Picks the active-language string. Same signature the wizard already used. */
export type Translate = (en: string, hi: string) => string;

const STORAGE_KEY = "bhojpatra-lang";

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

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "hi") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
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
