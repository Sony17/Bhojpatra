"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "./icons";

/**
 * Generic, reusable modal/dialog shell. Controlled via `open`; renders nothing
 * when closed. Closes on backdrop click or the X button. Unlike ConfirmDialog
 * (a fixed yes/no prompt) this takes arbitrary `children` + an optional `footer`,
 * so it's reused for richer flows (KYC review now; create/edit forms later).
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        onClick={onClose}
        aria-hidden="true"
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={
          "relative flex max-h-[85vh] w-full flex-col rounded-2xl border border-cream-3 bg-white shadow-xl focus:outline-none " +
          maxW
        }
      >
        <div className="flex items-center justify-between gap-3 border-b border-cream-3 px-6 py-4">
          {title && (
            <h2 className="font-display text-xl text-ink">{title}</h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
          >
            <Close className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap justify-end gap-2.5 border-t border-cream-3 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
