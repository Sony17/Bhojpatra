"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./cn";
import { motion as tokens } from "@/lib/design-tokens";

/**
 * Mobile bottom-sheet / side drawer (Swiggy-style). Slides a panel over a dimmed
 * backdrop; used for filters, menus and detail sheets on small screens. Handles
 * Escape, backdrop click and body-scroll lock. Motion capped at 300ms.
 *
 * `side`: "bottom" (default, mobile sheet) | "right" (side drawer).
 */
export default function Drawer({
  open,
  onClose,
  title,
  children,
  side = "bottom",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "bottom" | "right";
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const dur = tokens.base / 1000;
  const ease = tokens.ease;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur, ease }}
            className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={side === "bottom" ? { y: "100%" } : { x: "100%" }}
            animate={side === "bottom" ? { y: 0 } : { x: 0 }}
            exit={side === "bottom" ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: tokens.slow / 1000, ease }}
            className={cn(
              "relative mt-auto flex max-h-[88vh] w-full flex-col bg-white shadow-modal",
              side === "bottom"
                ? "rounded-t-sheet"
                : "ml-auto h-full max-h-full w-[min(24rem,90vw)] rounded-l-sheet",
              className,
            )}
          >
            {side === "bottom" && (
              <span className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-cream" />
            )}
            {title && (
              <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
                <h2 className="text-app-title text-ink">{title}</h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="focus-ring tap flex h-11 w-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-cream"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                    <path
                      d="M6 6l12 12M18 6 6 18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,var(--safe-bottom))] pt-2">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
