"use client";

import { useEffect, useState } from "react";

/**
 * Site-wide brand watermark — fades in after scroll. Desktop only: the blurred
 * full-viewport layer costs too much while scrolling on mobile.
 */
export default function ScrollWatermark() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip on phones — compositing a blurred full-screen image while scrolling
    // is a common source of jank on the home → occasions handoff.
    if (window.matchMedia("(max-width: 1023px)").matches) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 120);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 hidden items-center justify-center select-none transition-opacity duration-300 ease-out motion-reduce:transition-none lg:flex"
      style={{ opacity: scrolled ? 0.035 : 0 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/watermark-pot.png"
        alt=""
        width={421}
        height={534}
        className="scroll-watermark-img"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
