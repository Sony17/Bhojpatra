"use client";

/**
 * Tiny shared signal for the mobile compare tray's presence + measured height,
 * so the floating chat launcher can lift itself clear of the tray instead of
 * covering its "Compare" CTA. Module-level state + subscribers — mirrors the
 * pattern in `lib/accountMenu.ts`, no context provider needed.
 *
 * Also carries a same-tab "open the comparison table" request so detail-page
 * CTAs can open the tray's modal without navigating away.
 */
import { useEffect, useState } from "react";

let visible = false;
let height = 0;
const listeners = new Set<() => void>();

const OPEN_TABLE_EVENT = "bhojpatra:compare-open-table";

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Publish the compare tray's state. Called by the tray when it mounts / its
 * contents change; `trayHeight` is the measured height in px (0 when hidden) so
 * the chat launcher knows how far to move out of the way.
 */
export function setCompareTrayState(nextVisible: boolean, trayHeight = 0): void {
  visible = nextVisible;
  height = nextVisible ? trayHeight : 0;
  emit();
}

/** Reactive read of the compare tray state (visible flag + measured height). */
export function useCompareTrayState(): { visible: boolean; height: number } {
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

/** Ask the mounted CompareTray to open the side-by-side table modal. */
export function openCompareTable(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_TABLE_EVENT));
}

/** Subscribe the tray to external "open table" requests (detail-page CTAs). */
export function useCompareTableOpenRequest(onOpen: () => void): void {
  useEffect(() => {
    const handler = () => onOpen();
    window.addEventListener(OPEN_TABLE_EVENT, handler);
    return () => window.removeEventListener(OPEN_TABLE_EVENT, handler);
  }, [onOpen]);
}
