"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reusable confirmation modal for destructive / significant actions
 * (suspend, reject, delete…). Controlled via `open`; renders nothing when closed.
 * Closes on backdrop click, Cancel, or the Escape key. `tone="danger"` styles
 * the confirm button muted-destructive vs the default maroon.
 */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmCls =
    tone === "danger"
      ? "bg-ink text-cream hover:bg-ink/90"
      : "bg-maroon text-cream hover:bg-maroon-dark";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={onCancel}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl border border-cream-3 bg-white p-6 shadow-xl focus:outline-none"
      >
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {message && (
          <div className="mt-2 text-sm text-ink-soft">{message}</div>
        )}
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-cream-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              "rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors " +
              confirmCls
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
