"use client";

/**
 * Tiny shared signal for the mobile account popup so the floating chat launcher
 * can lift itself above the open menu instead of overlapping it. Module-level
 * state + subscribers, mirroring the pattern in `lib/session.ts` — no context
 * provider needed.
 */
import { useEffect, useState } from "react";

let open = false;
let height = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Publish the account popup's state. Called by the bottom tab bar when the menu
 * opens/closes; `menuHeight` is the measured popup height in px (0 when closed)
 * so subscribers know how far to move out of the way.
 */
export function setAccountMenuState(nextOpen: boolean, menuHeight = 0): void {
  open = nextOpen;
  height = nextOpen ? menuHeight : 0;
  emit();
}

/** Reactive read of the account popup state (open flag + measured height). */
export function useAccountMenuState(): { open: boolean; height: number } {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return { open, height };
}
