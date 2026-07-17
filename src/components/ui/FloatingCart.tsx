"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "./cn";
import { motion as motionTokens } from "@/lib/design-tokens";

/**
 * Floating cart / booking summary pill — sits above the tab bar when the user
 * has an in-progress selection (compare tray, booking draft, Baina qty).
 */
export default function FloatingCart({
  visible,
  title,
  subtitle,
  href,
  onClick,
  className,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-maroon">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 6h15l-1.5 9h-12z" />
          <circle cx="9" cy="20" r="1" />
          <circle cx="18" cy="20" r="1" />
          <path d="M6 6 5 3H2" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-bold text-cream">{title}</span>
        {subtitle && (
          <span className="block truncate text-[11px] text-cream/75">
            {subtitle}
          </span>
        )}
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 shrink-0 text-cream"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      >
        <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </>
  );

  const cls = cn(
    "flex w-full max-w-md items-center gap-3 rounded-sheet bg-maroon px-3.5 py-2.5 shadow-brand",
    className,
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: motionTokens.base / 1000, ease: motionTokens.ease }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tab-bar-h)+var(--safe-bottom)+0.5rem)] z-40 flex justify-center px-3 lg:hidden"
        >
          {href ? (
            <Link href={href} className={cn(cls, "pointer-events-auto")}>
              {inner}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClick}
              className={cn(cls, "pointer-events-auto text-left")}
            >
              {inner}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
