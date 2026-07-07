"use client";

/**
 * Tiny shared signal for the mobile sticky booking bar's presence + measured
 * height, so the floating chat launcher can lift itself clear of it instead of
 * covering the "Book" CTA. Module-level state + subscribers — mirrors the
 * pattern in `lib/compareTray.ts` / `lib/accountMenu.ts`, no provider needed.
 */
import { useEffect, useState } from "react";

let visible = false;
let height = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Publish the sticky booking bar's state. Called by the bar when it mounts /
 * resizes; `barHeight` is the measured height in px (0 when hidden) so the chat
 * launcher knows how far to move out of the way.
 */
export function setBookingBarState(nextVisible: boolean, barHeight = 0): void {
  visible = nextVisible;
  height = nextVisible ? barHeight : 0;
  emit();
}

/** Reactive read of the booking bar state (visible flag + measured height). */
export function useBookingBarState(): { visible: boolean; height: number } {
  const [, force] = useState(0);
  useEffect(() => {
    const rerender = () => force((n) => n + 1);
    listeners.add(rerender);
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return { visible, height };
}
