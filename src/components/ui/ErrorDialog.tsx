"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useLang } from "@/lib/i18n";
import Button from "./Button";
import { cn } from "./cn";

/**
 * The one popup for "something went wrong" on a critical customer path
 * (payment, placing a booking, sign-in, loading the roster, downloads).
 *
 *   const { showError } = useErrorDialog();
 *   showError({
 *     title: t("Couldn't place your booking", "…"),
 *     message: t("…what happened, in plain words…", "…"),
 *     reassurance: t("You haven't been charged.", "…"),   // only when guaranteed
 *     reference: { label: "Booking ID", value: id },
 *     actions: [{ label: t("Try again", "…"), onClick: retry }, …],
 *   });
 *
 * Content is always passed in already translated (callers hold `t`). The
 * dialog is an `alertdialog`: announced on open, focus moves into it and is
 * trapped, Esc / the backdrop / ✕ close it, and focus returns to whatever
 * had it before. Brand colours only — maroon for errors, cream for notices.
 */
export type ErrorDialogAction = {
  label: string;
  /** Runs after the dialog closes (unless `keepOpen`). */
  onClick?: () => void;
  /** Renders a link instead (internal path, https:, tel:, wa.me …). */
  href?: string;
  /** Open `href` in a new tab (support / WhatsApp links). */
  newTab?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  keepOpen?: boolean;
};

export type ErrorDialogSpec = {
  title: string;
  /** What happened, in plain words. */
  message: string;
  /** The server's specific sentence, when it adds something (shown as a quote). */
  detail?: string;
  /** What it means for their money / booking. Only state guarantees here. */
  reassurance?: string;
  /** A id the customer can quote to support (booking id, payment id, UTR). */
  reference?: { label: string; value: string };
  /** Priority order: first is the primary action. Empty → a single OK. */
  actions?: ErrorDialogAction[];
  /** "error" (maroon) for failures, "notice" (cream) for softer heads-ups. */
  tone?: "error" | "notice";
};

type Api = {
  showError: (spec: ErrorDialogSpec) => void;
  closeError: () => void;
};

const Ctx = createContext<Api | null>(null);

const FOCUSABLE =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ErrorDialogProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<ErrorDialogSpec | null>(null);
  const showError = useCallback((s: ErrorDialogSpec) => setSpec(s), []);
  const closeError = useCallback(() => setSpec(null), []);
  const api = useMemo(() => ({ showError, closeError }), [showError, closeError]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {spec && <ErrorDialogView spec={spec} onClose={closeError} />}
    </Ctx.Provider>
  );
}

export function useErrorDialog(): Api {
  const ctx = useContext(Ctx);
  // Outside the provider (tests, isolated renders) fall back to a no-op rather
  // than crash — the root layout always mounts the provider.
  return ctx ?? { showError: () => {}, closeError: () => {} };
}

function ErrorDialogView({
  spec,
  onClose,
}: {
  spec: ErrorDialogSpec;
  onClose: () => void;
}) {
  const { t } = useLang();
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const notice = spec.tone === "notice";
  const actions: ErrorDialogAction[] = spec.actions?.length
    ? spec.actions
    : [{ label: t("OK", "ठीक है") }];

  // Focus in on open, back out on close; keep the page behind from scrolling.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const scrollY = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-primary]");
    (first ?? panel)?.focus();
    return () => {
      document.body.style.overflow = scrollY;
      previous?.focus?.();
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes?.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(spec.reference?.value ?? "");
      setCopied(true);
    } catch {
      /* clipboard blocked — the id is on screen to read out or screenshot */
    }
  };

  return createPortal(
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-5"
    >
      <button
        type="button"
        tabIndex={-1}
        aria-label={t("Close", "बंद करें")}
        onClick={onClose}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="animate-rise relative max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-card border border-maroon/30 bg-surface p-5 text-ink shadow-modal outline-none sm:p-6"
      >
        <button
          type="button"
          aria-label={t("Close", "बंद करें")}
          onClick={onClose}
          className="focus-ring absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-ink-soft transition hover:bg-cream"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="flex items-start gap-3 pr-8">
          <span
            aria-hidden="true"
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg font-bold",
              notice ? "bg-cream text-maroon" : "bg-maroon text-cream",
            )}
          >
            {notice ? "i" : "!"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold leading-snug text-ink">
              {spec.title}
            </h2>
            <p id={descId} className="mt-1.5 text-sm leading-relaxed text-ink">
              {spec.message}
            </p>
          </div>
        </div>

        {spec.detail && (
          <p className="mt-3 rounded-control border-l-4 border-maroon bg-cream/50 px-3 py-2 text-sm text-ink">
            {spec.detail}
          </p>
        )}

        {spec.reassurance && (
          <p className="mt-3 flex items-start gap-2 rounded-control bg-cream px-3 py-2.5 text-sm font-medium text-ink">
            <svg viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-maroon" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{spec.reassurance}</span>
          </p>
        )}

        {spec.reference && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-control border border-cream-3 px-3 py-2 text-xs">
            <span className="min-w-0 break-all">
              <span className="text-ink-soft">{spec.reference.label}: </span>
              <span className="font-semibold text-ink">{spec.reference.value}</span>
            </span>
            <button
              type="button"
              onClick={copy}
              className="focus-ring shrink-0 rounded-full border border-maroon px-3 py-1 font-semibold text-maroon transition hover:bg-maroon hover:text-cream"
            >
              {copied ? t("Copied", "कॉपी हो गया") : t("Copy", "कॉपी")}
            </button>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          {actions.map((a, i) => {
            const variant = a.variant ?? (i === 0 ? "primary" : "secondary");
            const primary = i === 0;
            return (
              <Button
                key={`${a.label}-${i}`}
                variant={variant}
                className="w-full sm:w-auto"
                {...(primary ? { "data-primary": true } : {})}
                {...(a.href
                  ? {
                      href: a.href,
                      ...(a.newTab ? { target: "_blank" } : {}),
                      onClick: () => {
                        if (!a.keepOpen) onClose();
                        a.onClick?.();
                      },
                    }
                  : {
                      onClick: () => {
                        if (!a.keepOpen) onClose();
                        a.onClick?.();
                      },
                    })}
              >
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
