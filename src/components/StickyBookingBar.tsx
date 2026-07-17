"use client";

import { useEffect, useRef } from "react";
import { setBookingBarState } from "@/lib/bookingBar";
import { useCompareTrayState } from "@/lib/compareTray";
import { StickyActionBar } from "@/components/ui";

/**
 * Sticky booking CTA for vendor/venue detail — delegates chrome to StickyActionBar
 * and publishes height so FloatingChat lifts clear. Yields to CompareTray.
 */
export default function StickyBookingBar({
  price,
  priceNote,
  cta,
  href,
  onClick,
  hidden = false,
}: {
  price: string;
  priceNote?: string;
  cta: string;
  href?: string;
  onClick?: () => void;
  hidden?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const compareTray = useCompareTrayState();
  const shown = !hidden && !compareTray.visible;

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
    <div ref={ref}>
      <StickyActionBar
        price={price}
        priceNote={priceNote}
        cta={cta}
        href={href}
        onClick={onClick}
      />
    </div>
  );
}
