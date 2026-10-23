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
  // Mirrored as a CSS var so the footer can pad itself clear of the bar —
  // otherwise its last links sit under the dock with no way to scroll them out.
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--booking-bar-h", `${height}px`);
  }
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

/**
 * Publish a sticky bottom bar (e.g. a wizard's mobile Continue dock) as the
 * booking bar, so the chat launcher, install prompt and toasts lift clear of
 * it. Returns a callback ref for the bar's outer element; the height is kept
 * live with a ResizeObserver, and a `display:none` bar (desktop) reads as 0 →
 * not visible.
 */
export function useBookingBarDock<T extends HTMLElement>(): (el: T | null) => void {
  const [el, setEl] = useState<T | null>(null);
  useEffect(() => {
    if (!el) return;
    const measure = () => {
      const h = el.offsetHeight;
      setBookingBarState(h > 0, h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      ro.disconnect();
      setBookingBarState(false);
    };
  }, [el]);
  return setEl;
}
