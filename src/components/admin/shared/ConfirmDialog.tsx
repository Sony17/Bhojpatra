"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui";

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
        className="relative w-full max-w-md rounded-card border border-cream-3 bg-white p-6 shadow-modal focus:outline-none"
      >
        <h2 className="font-display text-xl text-ink">{title}</h2>
        {message && (
          <div className="mt-2 text-sm text-ink-soft">{message}</div>
        )}
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "destructive" : "primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
