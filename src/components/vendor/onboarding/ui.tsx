"use client";

/**
 * Shared presentation primitives for Vendor Registration V2.
 * Mirrors the handover prototype (mockups/vendor-registration-v2_Final.zip):
 * step eyebrow / heading / subtext, content cards, choice chips, the sticky
 * Back / Continue footer and bottom-sheet modals on mobile.
 *
 * Brand rule (CLAUDE.md): only maroon / cream / ink / white (+ alpha).
 */

import { useEffect, type ReactNode } from "react";
import { cn } from "@/components/ui/cn";

/* ── Responsive copy: desktop label + compact mobile label ───────────────── */
export function R({ d, m }: { d: ReactNode; m?: ReactNode }) {
  if (m === undefined) return <>{d}</>;
  return (
    <>
      <span className="hidden sm:inline">{d}</span>
      <span className="sm:hidden">{m}</span>
    </>
  );
}

/* ── Step heading ─────────────────────────────────────────────────────────── */
export function StepHeading({
  eyebrow,
  heading,
  subtext,
  mEyebrow,
  mHeading,
  mSubtext,
}: {
  eyebrow: string;
  heading: string;
  subtext?: string;
  mEyebrow?: string;
  mHeading?: string;
  mSubtext?: string | null;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.8px] text-maroon">
        <R d={eyebrow} m={mEyebrow} />
      </div>
      <h1 className="font-display text-[22px] leading-tight text-ink sm:text-[26px]">
        <R d={heading} m={mHeading} />
      </h1>
      {subtext && mSubtext !== null && (
        <p className="mt-1 max-w-[680px] text-[13px] text-ink/60">
          <R d={subtext} m={mSubtext} />
        </p>
      )}
      {subtext && mSubtext === null && (
        <p className="mt-1 hidden max-w-[680px] text-[13px] text-ink/60 sm:block">{subtext}</p>
      )}
    </div>
  );
}

/* ── Cards ────────────────────────────────────────────────────────────────── */
export function ContentCard({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mb-5 rounded-card border border-cream/60 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-[15px] font-bold text-ink">
      <span className="flex items-center gap-2">{children}</span>
      {badge && <Pill tone="cream">{badge}</Pill>}
    </div>
  );
}

export function Pill({
  children,
  tone = "cream",
  className,
}: {
  children: ReactNode;
  tone?: "cream" | "red" | "outline" | "ink";
  className?: string;
}) {
  const tones = {
    cream: "bg-cream/40 text-ink",
    red: "bg-maroon text-cream",
    outline: "border border-maroon/40 bg-maroon/5 text-maroon",
    ink: "bg-ink text-cream",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ── Form bits ────────────────────────────────────────────────────────────── */
export function FormLabel({
  children,
  required,
  sub,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  sub?: string;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold tracking-[0.2px] text-ink/80">
      {children}
      {required && <span className="text-maroon"> *</span>}
      {sub && <span className="ml-1 font-normal text-ink/50">{sub}</span>}
    </label>
  );
}

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-[11px] leading-snug text-ink/50", className)}>{children}</p>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs font-semibold text-maroon">⚠️ {children}</p>;
}

export const inputCls =
  "w-full min-h-[44px] rounded-control border border-cream bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 outline-none transition-colors focus:border-maroon focus:ring-2 focus:ring-maroon/15 disabled:bg-cream/20 disabled:text-ink/60";

/* ── Choice chip ──────────────────────────────────────────────────────────── */
export function ChoiceChip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[36px] select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "border-maroon bg-maroon font-bold text-cream"
          : "border-cream bg-white text-ink/80 hover:border-maroon/40",
        className,
      )}
    >
      {active && <span aria-hidden>✓</span>}
      {children}
    </button>
  );
}

/** Small inline "+ Custom" input that sits at the end of a chip row. */
export function ChipAddInput({
  value,
  onChange,
  onAdd,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  id?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-cream bg-white pl-3 pr-1">
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
        className="w-28 bg-transparent py-1.5 text-xs text-ink outline-none placeholder:text-ink/40"
      />
      <button
        type="button"
        onClick={onAdd}
        aria-label="Add"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-maroon text-sm font-bold text-cream"
      >
        +
      </button>
    </span>
  );
}

/* ── Quota stepper ────────────────────────────────────────────────────────── */
export function QtyStepper({
  value,
  onChange,
  min = 0,
  max = 24,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full border border-cream bg-white text-lg font-bold text-maroon disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <span className="w-6 text-center text-base font-bold text-ink">{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}

/* ── FSSAI diet mark (brand-safe: veg = outline, non-veg = filled red) ───── */
export function DietMark({ diet }: { diet?: string }) {
  const nv = diet === "non-veg";
  return (
    <span
      title={nv ? "Non-Vegetarian" : "100% Vegetarian"}
      className={cn(
        "inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] border-[1.5px]",
        nv ? "border-maroon" : "border-ink",
      )}
    >
      <span className={cn("h-1.5 w-1.5", nv ? "bg-maroon [clip-path:polygon(50%_0,100%_100%,0_100%)] h-2 w-2" : "rounded-full bg-ink")} />
    </span>
  );
}

/* ── Sticky footer: ← Back / Continue → ───────────────────────────────────── */
export function FlowFooter({
  onBack,
  onContinue,
  backLabel = "← Back",
  continueLabel = "Continue →",
  mBackLabel,
  mContinueLabel,
  saving,
  hideBack,
  center,
}: {
  onBack?: () => void;
  onContinue?: () => void;
  backLabel?: string;
  continueLabel?: string;
  mBackLabel?: string;
  mContinueLabel?: string;
  saving?: boolean;
  hideBack?: boolean;
  center?: ReactNode;
}) {
  return (
    <>
      {/* spacer so the fixed bar never hides content on mobile */}
      <div className="h-[calc(5.5rem+var(--tab-bar-h))] lg:h-4" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(var(--tab-bar-h)+var(--safe-bottom))] z-40 border-t border-cream/60 bg-white/95 px-4 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pr-[4.75rem] backdrop-blur lg:sticky lg:bottom-0 lg:pr-6 lg:mt-6 lg:rounded-card lg:border lg:pl-6 lg:py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          {!hideBack && onBack ? (
            <button
              type="button"
              onClick={onBack}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-cream px-4 text-[13px] font-bold text-ink/80 disabled:opacity-50 sm:px-5"
            >
              <R d={backLabel} m={mBackLabel} />
            </button>
          ) : (
            <span />
          )}
          {center && <div className="hidden text-center text-xs font-semibold text-ink/50 md:block">{center}</div>}
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              disabled={saving}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-maroon px-5 text-[13px] font-bold text-cream shadow-[0_6px_18px_-6px_rgba(185,32,37,0.45)] disabled:opacity-60 sm:px-6"
            >
              {saving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-cream border-t-transparent" />
                  Saving...
                </>
              ) : (
                <R d={continueLabel} m={mContinueLabel} />
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
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

/** Dashed "＋ Add …" row button. */
export function AddDashed({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-control border-2 border-dashed border-maroon/30 bg-maroon/5 text-[13px] font-bold text-maroon disabled:opacity-40"
    >
      <span aria-hidden>＋</span>
      {children}
    </button>
  );
}

/** Builder breadcrumb pills (Feast Details › Silver & Gold Tiers › …). */
export function SubnavPills({
  items,
  active,
  onSelect,
}: {
  items: { id: string; label: string; short: string }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav
      aria-label="Builder sections"
      className="-mx-4 mb-5 flex items-center gap-1 overflow-x-auto border-b border-cream/50 bg-white px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:rounded-card sm:border"
    >
      {items.map((it, i) => (
        <span key={it.id} className="flex shrink-0 items-center gap-1">
          {i > 0 && <span className="hidden text-ink/30 sm:inline">›</span>}
          <button
            type="button"
            onClick={() => onSelect(it.id)}
            aria-current={it.id === active ? "step" : undefined}
            className={cn(
              "min-h-[36px] whitespace-nowrap rounded-full px-3 text-xs font-semibold transition-colors",
              it.id === active ? "bg-maroon font-bold text-cream" : "text-ink/60 hover:bg-cream/30",
            )}
          >
            <R d={it.label} m={it.short} />
          </button>
        </span>
      ))}
    </nav>
  );
}
