"use client";

import { useEffect, useState } from "react";

/**
 * Site-wide brand watermark (the भोजपत्र handi) — fades in after scroll.
 * Kept as a single unblurred fixed layer so it stays cheap to composite on
 * phones; the earlier jank came from a blurred full-viewport layer.
 */
export default function ScrollWatermark() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

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
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center select-none transition-opacity duration-300 ease-out motion-reduce:transition-none"
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
