"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized, type HomeGalleryItem } from "@/lib/homeContent";

/**
 * Event gallery as one row of photo prints: the selected print sits large in
 * the centre, neighbours fan out smaller and dimmer on each side. Arrows,
 * keyboard, swipe and tapping a side print move the row; nothing auto-plays.
 * Brand only: the light section ground the gallery always had (white with a
 * soft red glow), white print frames, red/cream accents.
 */

// Position of a print by distance from the centre: shift (in % of the print's
// own width, so it scales with the print), size and visibility.
const SLOTS = [
  { x: 0, scale: 1, z: 30 },
  { x: 72, scale: 0.8, z: 20 },
  { x: 122, scale: 0.66, z: 10 },
  { x: 160, scale: 0.56, z: 5 },
];

export default function GalleryCoverflow() {
  const { lang, t } = useLang();
  const { gallery } = useHomeContent();

  // One row: both stored rows, de-duplicated, photos only.
  const seen = new Set<string>();
  const items: HomeGalleryItem[] = [...gallery.rowOne, ...gallery.rowTwo].filter(
    (it) => it.image && !seen.has(it.id) && seen.add(it.id),
  );
  const n = items.length;
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);

  if (n === 0) return null;
  const go = (step: number) => setIndex((i) => (i + step + n) % n);

  // Signed shortest distance from the centre print (the row wraps around).
  const offsetOf = (i: number) => {
    let d = i - index;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const current = items[index];

  return (
    <section className="relative overflow-hidden bg-white py-12 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[700px] max-w-[110vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(185,32,37,0.08),transparent_68%)] blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-maroon">
          {lang === "hi" ? gallery.eyebrowHi : gallery.eyebrow}
        </p>
        <h2 className="font-display mt-2 text-3xl leading-tight text-black sm:text-5xl">
          {lang === "hi" ? gallery.headingHi : gallery.heading}{" "}
          <span className="text-maroon">{lang === "hi" ? gallery.headingEmHi : gallery.headingEm}</span>
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-[15px] text-black/70 sm:mt-3 sm:text-base">
          {lang === "hi" ? gallery.subtitleHi : gallery.subtitle}
        </p>
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={t("Event gallery", "इवेंट गैलरी")}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
        className="relative mx-auto mt-8 h-[320px] max-w-6xl touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-maroon sm:mt-10 sm:h-[420px] lg:h-[500px]"
      >
        {items.map((item, i) => {
          const off = offsetOf(i);
          const dist = Math.abs(off);
          // Phones show the centre and one print each side; wider screens three.
          if (dist > 3) return null;
          const slot = SLOTS[dist];
          const title = lang === "hi" ? item.titleHi : item.title;
          const caption = lang === "hi" ? item.captionHi : item.caption;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (off === 0 ? undefined : setIndex(i))}
              aria-label={off === 0 ? title : t(`Show ${title}`, `${title} दिखाएं`)}
              aria-current={off === 0 || undefined}
              tabIndex={off === 0 ? -1 : 0}
              className={
                "absolute left-1/2 top-1/2 w-[64vw] max-w-[300px] bg-white p-2 pb-9 text-left shadow-[0_2px_6px_rgba(0,0,0,0.06),0_24px_44px_-18px_rgba(0,0,0,0.35)] ring-1 ring-cream transition-[transform,filter] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none sm:max-w-none sm:w-[340px] sm:p-3 sm:pb-12 lg:w-[420px] " +
                (dist >= 2 ? "hidden sm:block " : "") +
                (off === 0 ? "cursor-default" : "cursor-pointer")
              }
              style={{
                transform: `translate(-50%, -50%) translateX(${Math.sign(off) * slot.x}%) scale(${slot.scale})`,
                zIndex: slot.z,
                filter: off === 0 ? "none" : `brightness(${dist === 1 ? 0.8 : 0.68})`,
              }}
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-cream">
                <Image
                  src={item.image}
                  alt={off === 0 ? title : ""}
                  fill
                  sizes="(min-width:1024px) 420px, (min-width:640px) 340px, 64vw"
                  className="object-cover"
                  unoptimized={isUnoptimized(item.image)}
                  draggable={false}
                />
                {caption && (
                  <span className="absolute left-2 top-2 bg-black/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cream sm:left-3 sm:top-3 sm:text-[10px]">
                    {caption}
                  </span>
                )}
              </span>
              <span className="font-display absolute inset-x-0 bottom-2 block truncate px-3 text-center text-lg text-maroon sm:bottom-3 sm:text-xl">
                {title}
              </span>
            </button>
          );
        })}

        <Arrow dir="prev" onClick={() => go(-1)} label={t("Previous photo", "पिछली फोटो")} />
        <Arrow dir="next" onClick={() => go(1)} label={t("Next photo", "अगली फोटो")} />
      </div>

      {/* Position dots */}
      <div className="mt-6 flex justify-center gap-1.5 sm:mt-8" aria-hidden="true">
        {items.map((it, i) => (
          <span
            key={it.id}
            className={"h-1.5 rounded-full transition-all duration-300 " + (i === index ? "w-6 bg-maroon" : "w-1.5 bg-maroon/25")}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {lang === "hi" ? current.titleHi : current.title}
      </p>
    </section>
  );
}

function Arrow({ dir, onClick, label }: { dir: "prev" | "next"; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={
        "absolute top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-maroon/30 bg-white text-maroon shadow-[0_4px_12px_-6px_rgba(0,0,0,0.3)] transition-colors hover:bg-maroon hover:text-white focus-visible:outline-2 focus-visible:outline-maroon sm:h-12 sm:w-12 " +
        (dir === "prev" ? "left-2 sm:left-4" : "right-2 sm:right-4")
      }
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5" aria-hidden="true">
        <path d={dir === "prev" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
