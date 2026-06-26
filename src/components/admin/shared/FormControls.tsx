import type { ReactNode } from "react";

/**
 * Shared form primitives reused by every admin form (coupons, add-ons, menu,
 * settings, content). One copy of the input styling + field/toggle so forms
 * stay consistent and DRY.
 */
export const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

/** Brand on/off switch. Controlled. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
        (checked ? "bg-maroon" : "bg-cream-3")
      }
    >
      <span
        className={
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0.5")
        }
      />
    </button>
  );
}
