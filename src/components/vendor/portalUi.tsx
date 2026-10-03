"use client";

/**
 * Vendor Portal primitives: bottom-sheet modal, primary/secondary pill buttons
 * and display labels. Copied from the V2 onboarding kit
 * (components/vendor/onboarding/ui.tsx on vendor-patch) so the dashboard can
 * ship without the registration wizard.
 *
 * Brand rule (CLAUDE.md): only maroon / cream / ink / white (+ alpha).
 */

import { useEffect, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";
import type { VendorDietaryOffering } from "@/lib/vendorMenus";

export const DIET_NAMES: Record<VendorDietaryOffering, string> = {
  veg: "Pure Veg",
  "non-veg": "Non-Veg Only",
  both: "Both Veg & Non-Veg",
};

/** Stall category labels (handover PREDEFINED_STALL_CATEGORIES). */
const STALL_CATEGORY_NAMES: { id: string; name: string }[] = [
  { id: "chaat", name: "Chaat" },
  { id: "juices", name: "Juices & Shakes" },
  { id: "beverages", name: "Beverages & Chai" },
  { id: "south-indian", name: "South Indian" },
  { id: "north-indian", name: "North Indian & Mughlai" },
  { id: "chinese", name: "Chinese & Pan-Asian" },
  { id: "snacks", name: "Snacks & Fast Food" },
  { id: "desserts", name: "Desserts & Sweets" },
  { id: "ice-cream", name: "Ice Cream & Kulfi" },
  { id: "street-food", name: "Street Food Specials" },
  { id: "live-grills", name: "Live Grills & Barbecue" },
  { id: "breakfast", name: "Breakfast Counter" },
  { id: "regional", name: "Regional / Specialty" },
];

/** Older stall ids saved before the V2 category list. */
const LEGACY_NAMES: Record<string, string> = {
  live: "Live Tandoor & Grill",
  pizza: "Wood-Fired Pizza",
  pasta: "Live Pasta Piazza",
  pan: "Banarasi Paan Counter",
  momo: "Momo & Dimsum Counter",
  waffle: "Waffle & Pancake Bar",
  dessert: "Live Sweets & Dessert",
  "hi-tea": "Evening Hi-Tea & Nasta",
  coffee: "Barista Coffee & Chai",
  mocktail: "Mocktail & Juice Bar",
};

export function stallCategoryName(id: string) {
  return STALL_CATEGORY_NAMES.find((c) => c.id === id)?.name ?? LEGACY_NAMES[id] ?? id;
}

/* ── Modal → bottom sheet on mobile ───────────────────────────────────────── */
export function Sheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-sheet bg-white shadow-xl sm:rounded-card",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-cream sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 border-b border-cream/60 px-5 py-4">
          <div>
            {eyebrow && <div className="text-[11px] font-bold uppercase tracking-wide text-maroon">{eyebrow}</div>}
            <div className="text-base font-bold text-ink">{title}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/60 hover:bg-cream/30"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-cream/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function BtnNext({
  children,
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-maroon px-5 text-[13px] font-bold text-cream disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function BtnBack({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-cream px-4 text-[13px] font-bold text-ink/80 disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
