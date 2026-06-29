"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Site-wide brand watermark — the Bhojpatra matka (clay pot) artwork sitting
 * large and centered behind the page, roughly 80% of the viewport tall. It
 * stays hidden over the hero/top of a page and gently fades in once the visitor
 * starts scrolling.
 *
 * Rendered once in the root layout so it sits on every route. It is kept at a
 * very low opacity so it reads as a background wash that never disturbs the
 * legibility of text or the surfaces/boxes it sits behind, and it is
 * `pointer-events: none` + `aria-hidden` so it never intercepts clicks or shows
 * up to assistive tech. Motion is skipped for `prefers-reduced-motion`.
 */
export default function ScrollWatermark() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center select-none transition-opacity duration-700 ease-out motion-reduce:transition-none"
      style={{ opacity: scrolled ? 0.07 : 0 }}
    >
      <Image
        src="/watermark-pot.png"
        alt=""
        width={421}
        height={534}
        priority={false}
        className="h-[80vh] w-auto max-w-[90vw]"
      />
    </div>
  );
}
