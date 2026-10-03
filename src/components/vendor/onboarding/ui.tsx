"use client";

/**
 * Shared presentation primitives for Vendor Registration V2.
 *
 * Markup and class names mirror the handover prototype 1:1
 * (mockups/vendor-registration-v2_Final.zip — index.html / styles.css); the
 * styles themselves live in ./onboarding.css, scoped under `.vob`.
 */

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/cn";

/* ── Responsive copy: desktop label + compact mobile label ───────────────── */
export function R({ d, m }: { d: ReactNode; m?: ReactNode }) {
  if (m === undefined) return <>{d}</>;
  return (
    <>
      <span className="vob-d">{d}</span>
      <span className="vob-m">{m}</span>
    </>
  );
}

/* ── Step heading (.step-header) ─────────────────────────────────────────── */
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
    <header className="step-header">
      <div className="step-eyebrow">
        <R d={eyebrow} m={mEyebrow} />
      </div>
      <h1 className="step-heading">
        <R d={heading} m={mHeading} />
      </h1>
      {subtext && mSubtext !== null && (
        <p className="step-subtext">
          <R d={subtext} m={mSubtext} />
        </p>
      )}
      {subtext && mSubtext === null && <p className="step-subtext vob-d">{subtext}</p>}
    </header>
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
    <div id={id} className={cn("content-card", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, badge }: { children: ReactNode; badge?: string }) {
  return (
    <div className="card-title-row">
      <span className="card-title">{children}</span>
      {badge && <span className="vob-badge">{badge}</span>}
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
  return <span className={cn("vob-badge", `vob-badge-${tone}`, className)}>{children}</span>;
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
    <label htmlFor={htmlFor} className="form-label">
      {children}
      {required && <span className="required"> *</span>}
      {sub && <span className="form-label-sub"> {sub}</span>}
    </label>
  );
}

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("field-hint", className)}>{children}</span>;
}

export function FieldError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <span className="vob-field-error">⚠️ {children}</span>;
}

/** Inputs, selects and textareas all share the prototype's `.form-input` look. */
export const inputCls = "form-input";

/* ── Choice chip (.choice-chip) ───────────────────────────────────────────── */
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
      className={cn("choice-chip", active && "active", className)}
    >
      {active && <span className="chip-check">✓</span>}
      {children}
    </button>
  );
}

/** Inline "+ Custom" adder at the end of a chip row (.chip-custom-adder). */
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
    <div className="chip-custom-adder">
      <input
        id={id}
        type="text"
        className="input-chip-add"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder.replace(/^\+\s*/, "")}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
      />
      <button type="button" className="btn-chip-add" onClick={onAdd} title="Add" aria-label="Add">
        +
      </button>
    </div>
  );
}

/* ── Quota stepper (.quota-stepper) ───────────────────────────────────────── */
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
  return (
    <div className="quota-stepper">
      <button
        type="button"
        className="stepper-btn"
        aria-label="Decrease"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        −
      </button>
      <span className="stepper-val">{value}</span>
      <button
        type="button"
        className="stepper-btn"
        aria-label="Increase"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}

/* ── FSSAI diet mark (.fssai-icon) — veg = ink dot, non-veg = red triangle ── */
export function DietMark({ diet }: { diet?: string }) {
  const nv = diet === "non-veg";
  return (
    <span
      className={cn("fssai-icon", nv ? "nonveg" : "veg")}
      title={nv ? "Non-Vegetarian" : "100% Vegetarian"}
    />
  );
}

/* ── Sticky wizard footer (.wizard-footer): ← Back / Continue → ───────────────
   Rendered into the shell's footer slot so it docks to the bottom of the
   onboarding frame exactly like the prototype. */
/** Shell-owned mount points for the sticky footer and the builder sub-nav. */
export const ShellSlots = createContext<{ footer: HTMLElement | null; subnav: HTMLElement | null }>({
  footer: null,
  subnav: null,
});

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
  const slot = useContext(ShellSlots).footer;

  const bar = (
    <footer className="wizard-footer">
      <button
        type="button"
        className="btn-back"
        onClick={onBack}
        disabled={saving || hideBack || !onBack}
        style={hideBack || !onBack ? { visibility: "hidden" } : undefined}
      >
        <R d={backLabel} m={mBackLabel} />
      </button>
      <div className="vob-footer-center">{center ?? "Bhojpatra Vendor Onboarding V2"}</div>
      <button type="button" className="btn-next" onClick={onContinue} disabled={saving || !onContinue}>
        {saving ? "Saving..." : <R d={continueLabel} m={mContinueLabel} />}
      </button>
    </footer>
  );
  return slot ? createPortal(bar, slot) : null;
}

/* ── Modal (.modal-backdrop > .modal-sheet) — bottom sheet on phones ──────── */
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
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="vob">
      <div
        className="modal-backdrop open"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className={cn("modal-sheet", wide && "storefront-preview-sheet")}>
          <div className="modal-header">
            <div>
              {eyebrow && <span className="vob-modal-eyebrow">{eyebrow}</span>}
              <div className="modal-title">{title}</div>
            </div>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="modal-body">{children}</div>
          {footer && <div className="modal-footer">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
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
    <button type={type} onClick={onClick} disabled={disabled} className={cn("btn-next", className)}>
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
    <button type="button" onClick={onClick} disabled={disabled} className={cn("btn-back", className)}>
      {children}
    </button>
  );
}

/** Dashed "＋ Add …" row button (.btn-add-item-dashed). */
export function AddDashed({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={disabled || undefined}
      className={cn("btn-add-item-dashed", disabled && "limit-reached")}
    >
      <span>＋</span> {children}
    </button>
  );
}

/** Builder breadcrumb (.builder-subnav-bar): Feast Details › Silver & Gold Tiers › … */
export function SubnavPills({
  items,
  active,
  onSelect,
}: {
  items: { id: string; label: string; short: string }[];
  active: string;
  onSelect: (id: string) => void;
}) {
  const slot = useContext(ShellSlots).subnav;
  const bar = (
    <nav className="builder-subnav-bar" aria-label="Builder sections">
      {items.map((it, i) => (
        <span key={it.id} style={{ display: "contents" }}>
          {i > 0 && <span className="subnav-divider vob-d">›</span>}
          <button
            type="button"
            className={cn("subnav-pill", it.id === active && "active")}
            aria-current={it.id === active ? "step" : undefined}
            onClick={() => onSelect(it.id)}
          >
            <R d={it.label} m={it.short} />
          </button>
        </span>
      ))}
    </nav>
  );
  return slot ? createPortal(bar, slot) : null;
}
