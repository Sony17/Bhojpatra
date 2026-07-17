"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * In-app top bar for detail / secondary screens — back + title + optional
 * trailing actions. Sticky glass chrome on mobile.
 */
export default function AppBar({
  title,
  subtitle,
  backHref,
  onBack,
  trailing,
  transparent = false,
  className,
}: {
  title?: string;
  subtitle?: string;
  backHref?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  transparent?: boolean;
  className?: string;
}) {
  const router = useRouter();

  const goBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex items-center gap-2 px-3 py-2.5 pt-[max(0.625rem,var(--safe-top))]",
        transparent
          ? "bg-transparent"
          : "app-glass border-b border-maroon/6 shadow-soft",
        className,
      )}
    >
      <button
        type="button"
        onClick={goBack}
        aria-label="Go back"
        className="focus-ring tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition duration-150 active:scale-95 hover:bg-cream/60"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 6 9 12l6 6" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        {title && (
          <h1 className="truncate text-[15px] font-bold tracking-tight text-ink sm:text-base">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="truncate text-caption text-ink/50">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
    </header>
  );
}
