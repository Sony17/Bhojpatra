"use client";

import { useEffect } from "react";

/**
 * Drop the phone footer (the About / Help / Terms strip) while a screen is
 * mounted — app-style flows like Single Stall end on their own content, not on
 * a block of white. Toggles `html.hide-mobile-footer`; globals.css hides the
 * strip below lg and moves its tab-bar / dock clearance onto the page.
 */
export function useHideMobileFooter(active = true): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add("hide-mobile-footer");
    return () => root.classList.remove("hide-mobile-footer");
  }, [active]);
}

/**
 * Hide the floating support button on phones while a screen is mounted —
 * checkout screens that fit one viewport would otherwise have it parked on
 * their totals. Toggles `html.hide-chat-fab` (see globals.css).
 */
export function useHideChatFab(active = true): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    root.classList.add("hide-chat-fab");
    return () => root.classList.remove("hide-chat-fab");
  }, [active]);
}
