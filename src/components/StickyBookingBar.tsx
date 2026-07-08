"use client";

import { useEffect, useRef } from "react";
import { setBookingBarState } from "@/lib/bookingBar";
import { useCompareTrayState } from "@/lib/compareTray";
import { Button } from "@/components/ui";

/**
 * Swiggy/Zomato-style sticky action bar for mobile detail pages: price on the
 * left, primary CTA on the right, pinned just above the bottom tab bar. Desktop
 * keeps its own inline / sticky booking panel, so this is `lg:hidden`.
 *
 * It yields to the compare tray (which owns the same bottom dock, so the two
 * never stack) and publishes its height so the floating chat launcher lifts
 * clear of it — see `lib/bookingBar`.
 */
export default function StickyBookingBar({
  price,
  priceNote,
  cta,
  href,
  onClick,
  hidden = false,
}: {
  /** Big headline number, e.g. "₹1,200". */
  price: string;
  /** Small caption under the price, e.g. "per plate onwards". */
  priceNote?: string;
  /** CTA label, e.g. "Start a Booking". */
  cta: string;
  /** When set the CTA is a link; otherwise it's a button running `onClick`. */
  href?: string;
  onClick?: () => void;
  /** Force-hide (e.g. once the booking is done / mid-payment). */
  hidden?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const compareTray = useCompareTrayState();
  // The compare tray owns the bottom dock while it's up; step aside so the two
  // never stack. Callers can also force-hide via `hidden`.
  const shown = !hidden && !compareTray.visible;

  // Publish presence + measured height so the chat launcher lifts clear of the
  // bar. Re-measure on resize (the bar is `lg:hidden`, so it collapses to 0 on
  // desktop and the launcher stays put there). Clear the signal on unmount.
  useEffect(() => {
    const measure = () => {
      const h = ref.current?.offsetHeight ?? 0;
      if (shown && h > 0) setBookingBarState(true, h);
      else setBookingBarState(false);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      setBookingBarState(false);
    };
  }, [shown]);

  if (!shown) return null;

  return (
    // Pinned above the mobile bottom tab bar (which is `lg:hidden`).
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 px-3 pb-2 lg:hidden"
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-card border border-cream-3 bg-white/95 px-4 py-2.5 shadow-pop-up backdrop-blur-sm">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold leading-tight text-maroon">
            {price}
          </p>
          {priceNote && (
            <p className="truncate text-caption leading-tight text-ink-soft">
              {priceNote}
            </p>
          )}
        </div>
        <Button href={href} onClick={onClick} className="shrink-0">
          {cta}
        </Button>
      </div>
    </div>
  );
}
