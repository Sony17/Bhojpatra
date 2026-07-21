"use client";

import { useState } from "react";
import { controlClass } from "@/components/ui/Input";

/**
 * Shared form primitives reused by every admin form (coupons, add-ons, menu,
 * settings, content). Input styling + Field come from the design system
 * (ui/Input) so admin forms match the app-wide controls; the password input
 * and toggle stay admin-specific.
 */
export { Field } from "@/components/ui/Input";
export const inputClass = controlClass;

/** Eye / eye-off icon for the password visibility toggle. */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {off ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.4 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7-.4 1-1.2 2.1-2.3 3.1M6.1 6.1C3.9 7.4 2.4 9.6 2 12c.5 1.4 2 3.2 4 4.4A9.3 9.3 0 0 0 12 19c1 0 1.9-.1 2.8-.4" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/** Password input with a show/hide (eye) toggle. Controlled. */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={inputClass + " pr-11"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        className="focus-ring absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-soft transition-colors hover:text-maroon"
      >
        <EyeIcon off={show} />
      </button>
    </span>
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
        "focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors " +
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
