import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

/**
 * Unified form-control styling for the whole app. One radius
 * (`rounded-control`), one fill (`bg-cream/40` → white on focus), one focus
 * treatment (maroon border + soft red ring). This is the app-wide successor to
 * admin's `inputClass` — same look, bumped to the 12px control radius and a
 * 44px min height for touch.
 */
export const controlClass =
  "w-full min-h-11 rounded-control border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors duration-200 focus:border-maroon focus:bg-white focus:ring-2 focus:ring-maroon/25 disabled:cursor-not-allowed disabled:opacity-50";

/** Danger/error state — brand red border + ring (never a new colour). */
const ERROR = "border-maroon bg-white focus:ring-maroon/30";

export function Input({
  error,
  className,
  ...rest
}: { error?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      aria-invalid={error || undefined}
      className={cn(controlClass, error && ERROR, className)}
      {...rest}
    />
  );
}

export function Textarea({
  error,
  className,
  ...rest
}: { error?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      aria-invalid={error || undefined}
      className={cn(controlClass, "min-h-28 resize-y", error && ERROR, className)}
      {...rest}
    />
  );
}

/**
 * Label + control wrapper with hint and inline validation. One field layout
 * across every form (auth, booking, vendor, partner, admin).
 */
export function Field({
  label,
  children,
  hint,
  error,
  required,
  htmlFor,
}: {
  label?: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      {label && (
        <span className="mb-1.5 block text-caption font-semibold text-ink">
          {label}
          {required && <span className="text-maroon"> *</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-caption font-medium text-maroon">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-caption text-ink-soft">{hint}</span>
      )}
    </label>
  );
}
