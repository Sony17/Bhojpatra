"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized, type HomeGalleryItem } from "@/lib/homeContent";

/**
 * Event gallery as one row of photo prints: the selected print sits large in
 * the centre, neighbours fan out smaller and dimmer on each side. Arrows,
 * keyboard, swipe and tapping a side print move the row. The row follows the
 * finger while dragging, and a flick keeps it gliding through several prints
 * one after another (a longer or faster swipe goes further). It never moves
 * on its own otherwise.
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

/** Real Bhojpatra event set-ups: the only photos in the row. */
const EVENT_PHOTOS: HomeGalleryItem[] = [
  { id: "ev-1", title: "Fruit Bagiya Live Counters", titleHi: "फ्रूट बगिया लाइव काउंटर", caption: "Wedding · Night Setup", captionHi: "शादी · रात की सजावट", image: "/gallery/event-1.jpg" },
  { id: "ev-2", title: "Fabulous Fruit Bagiya", titleHi: "फैबुलस फ्रूट बगिया", caption: "Fruit Stall", captionHi: "फ्रूट स्टॉल", image: "/gallery/event-2.jpg" },
  { id: "ev-3", title: "Garden of Light Counters", titleHi: "रोशनी वाले काउंटर", caption: "Reception · Live Counters", captionHi: "रिसेप्शन · लाइव काउंटर", image: "/gallery/event-3.jpg" },
  { id: "ev-4", title: "Evening Stall Promenade", titleHi: "शाम की स्टॉल गली", caption: "Wedding · Open Lawn", captionHi: "शादी · खुला लॉन", image: "/gallery/event-4.jpg" },
  { id: "ev-5", title: "Royal Buffet Spread", titleHi: "शाही बुफे", caption: "Banquet · Buffet", captionHi: "बैंक्वेट · बुफे", image: "/gallery/event-5.jpg" },
];

export default function GalleryCoverflow() {
  const { lang, t } = useLang();
  const { gallery } = useHomeContent();

  // One row of real Bhojpatra event photos only (stored gallery photos are
  // the fallback if that list is ever emptied).
  const seen = new Set<string>();
  const items: HomeGalleryItem[] = (EVENT_PHOTOS.length ? EVENT_PHOTOS : [...gallery.rowOne, ...gallery.rowTwo]).filter(
    (it) => it.image && !seen.has(it.id) && seen.add(it.id),
  );
  const n = items.length;
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const startT = useRef(0);
  const moved = useRef(false);
  const [drag, setDrag] = useState(0);
  const glide = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopGlide = () => {
    if (glide.current) clearInterval(glide.current);
    glide.current = null;
  };
  useEffect(() => stopGlide, []);

  if (n === 0) return null;
  const go = (step: number) => setIndex((i) => (i + step + n) % n);

  // Step through `count` prints one at a time so a flick reads as a glide.
  const glideBy = (count: number, dir: 1 | -1) => {
    stopGlide();
    go(dir);
    let left = count - 1;
    if (left <= 0) return;
    glide.current = setInterval(() => {
      go(dir);
      left -= 1;
      if (left <= 0) stopGlide();
    }, 190);
  };

  // Signed shortest distance from the centre print (the row wraps around).
  const offsetOf = (i: number) => {
    let d = i - index;
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  };

  const current = items[index];

  return (
    <section className="relative overflow-hidden bg-white py-10 sm:py-14">
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
        onPointerDown={(e) => {
          stopGlide();
          startX.current = e.clientX;
          startT.current = performance.now();
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          if (Math.abs(dx) > 8) moved.current = true;
          setDrag(dx);
        }}
        onPointerCancel={() => {
          startX.current = null;
          setDrag(0);
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          const speed = Math.abs(dx) / Math.max(1, performance.now() - startT.current); // px per ms
          startX.current = null;
          setDrag(0);
          if (Math.abs(dx) > 40) {
            const steps = Math.min(5, Math.max(1, Math.round(Math.abs(dx) / 150 + speed * 1.5)));
            glideBy(steps, dx < 0 ? 1 : -1);
          }
        }}
        className="relative mx-auto mt-6 h-[290px] max-w-6xl touch-pan-y select-none outline-none focus-visible:ring-2 focus-visible:ring-maroon sm:mt-8 sm:h-[390px] lg:h-[450px]"
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
              onClick={() => {
                // A drag ends in a click on the print under the finger; ignore it.
                if (moved.current || off === 0) return;
                stopGlide();
                setIndex(i);
              }}
              aria-label={off === 0 ? title : t(`Show ${title}`, `${title} दिखाएं`)}
              aria-current={off === 0 || undefined}
              tabIndex={off === 0 ? -1 : 0}
              className={
                "absolute left-1/2 top-1/2 w-[74vw] max-w-[345px] bg-white p-2 pb-9 text-left shadow-[0_2px_6px_rgba(0,0,0,0.06),0_24px_44px_-18px_rgba(0,0,0,0.35)] ring-1 ring-cream transition-[transform,filter] duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none sm:max-w-none sm:w-[390px] sm:p-3 sm:pb-12 lg:w-[485px] " +
                (dist >= 2 ? "hidden sm:block " : "") +
                (off === 0 ? "cursor-default" : "cursor-pointer")
              }
              style={{
                transform: `translate(-50%, -50%) translateX(calc(${Math.sign(off) * slot.x}% + ${drag * 0.6}px)) scale(${slot.scale})`,
                transitionDuration: drag ? "0ms" : undefined,
                zIndex: slot.z,
                filter: off === 0 ? "none" : `brightness(${dist === 1 ? 0.9 : 0.8})`,
              }}
            >
              <span className="relative block aspect-[4/3] w-full overflow-hidden bg-cream">
                <Image
                  src={item.image}
                  alt={off === 0 ? title : ""}
                  fill
                  sizes="(min-width:1024px) 485px, (min-width:640px) 390px, 74vw"
                  className="object-cover"
                  unoptimized={isUnoptimized(item.image)}
                  draggable={false}
                />
                {/* Occasion-card overlay, 30% lighter */}
                <span aria-hidden="true" className="absolute inset-0 bg-black/30" />
                <span aria-hidden="true" className="media-veil absolute inset-0 opacity-70" />
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
