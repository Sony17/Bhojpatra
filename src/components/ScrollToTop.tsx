"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Resets scroll to the top of the window on every route (pathname) change.
 * Next.js normally does this for <Link> navigations, but programmatic
 * navigation (router.push/replace) and cross-flow transitions can leave the
 * page scrolled mid-way — this guarantees every page opens at the top.
 *
 * Only pathname is watched (not search params), so in-page steps that change
 * only the query string (e.g. the booking wizard) keep their scroll position.
 */
export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Skip when navigating to an in-page anchor (#section) so hash links work.
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
