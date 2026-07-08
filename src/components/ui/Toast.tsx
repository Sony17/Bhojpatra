"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "./cn";

/**
 * Lightweight, dependency-free toast system. Wrap the app once with
 * <ToastProvider> (done in the root layout), then call `useToast()` anywhere:
 *
 *   const { toast } = useToast();
 *   toast("Booking confirmed", { tone: "success" });
 *
 * Tones stay on-brand: success = solid red, error = brand-black, default =
 * white card with a red accent edge.
 */
type Tone = "default" | "success" | "error";
type ToastItem = { id: number; message: string; tone: Tone };

type ToastApi = { toast: (message: string, opts?: { tone?: Tone }) => void };

const ToastCtx = createContext<ToastApi | null>(null);

const TONE_CLASS: Record<Tone, string> = {
  default: "border-l-4 border-maroon bg-white text-ink",
  success: "bg-maroon text-cream",
  error: "bg-ink text-cream",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastApi["toast"]>(
    (message, opts) => {
      const id = nextId.current++;
      setItems((list) => [...list, { id, message, tone: opts?.tone ?? "default" }]);
      setTimeout(() => remove(id), 3600);
    },
    [remove],
  );

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-6 sm:items-end">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "animate-rise pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card px-4 py-3 text-sm font-medium shadow-modal",
              TONE_CLASS[t.tone],
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => remove(t.id)}
              className="focus-ring -mr-1 shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  // No-op fallback so calling useToast() outside the provider never crashes.
  return ctx ?? { toast: () => {} };
}
