"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import {
  useHomeContent,
  isUnoptimized,
  type HomeGalleryItem,
} from "@/lib/homeContent";

/**
 * Spread layout for the seven cards in the scroll-driven cluster. Each entry is
 * the card's *fully spread* offset from centre (px) and its size. At
 * scroll-progress 0 every card is collapsed onto the centre (a neat stack); as
 * the section scrolls into view the offsets ease to 100%, opening the cards out
 * into a clean, evenly spaced row — every image sits independently, none
 * overlapping. Card width/height scale with the same `spread` factor as the
 * spacing (see render), so the row never collapses into overlap on narrow
 * screens. The 160px step exceeds the 150px card width, leaving a gap between
 * neighbours. Flat (no tilt) so corners never clash.
 */
const FAN = [
  { x: -480, y: 0, r: 0, w: 150, h: 200, z: 1 },
  { x: -320, y: 0, r: 0, w: 150, h: 200, z: 1 },
  { x: -160, y: 0, r: 0, w: 150, h: 200, z: 1 },
  { x: 0, y: 0, r: 0, w: 150, h: 200, z: 1 },
  { x: 160, y: 0, r: 0, w: 150, h: 200, z: 1 },
  { x: 320, y: 0, r: 0, w: 150, h: 200, z: 1 },
  { x: 480, y: 0, r: 0, w: 150, h: 200, z: 1 },
];

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export default function Gallery() {
  const { lang } = useLang();
  const { gallery } = useHomeContent();
  const galleryItems = gallery.items;
  const clusterRef = useRef<HTMLDivElement>(null);
  /** 0 → stacked at centre, 1 → fully fanned out. */
  const [progress, setProgress] = useState(0);
  /** Horizontal spread factor so the fan never overflows on narrow screens. */
  const [spread, setSpread] = useState(1);
  /** Intro drop-in fires once the cluster scrolls into view. */
  const [shown, setShown] = useState(false);
  /** Whether continuous float / scroll-scrub should run at all. */
  const [motion, setMotion] = useState(false);

  // Intro reveal (runs even under reduced motion — it just appears).
  useEffect(() => {
    const node = clusterRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // Scroll-scrub the fan-out + keep the spread responsive.
  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduce) {
      setProgress(1); // show the fully fanned arrangement, statically
      return;
    }
    setMotion(true);

    const node = clusterRef.current;
    if (!node) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      // Ease from clustered (top at 88% of viewport) to fanned (top at 32%).
      const start = vh * 0.88;
      const end = vh * 0.32;
      setProgress(clamp((start - rect.top) / (start - end)));
      setSpread(clamp(rect.width / 1120, 0.34, 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const fanCards = galleryItems.slice(0, FAN.length);

  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      {/* Hairline divider that opens the section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-maroon/25 to-transparent"
      />
      {/* Whisper-soft maroon bloom behind the cluster — barely there */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-28 -z-10 h-[460px] w-[760px] max-w-[110vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(185,32,37,0.09),transparent_68%)] blur-3xl"
      />

      {/* Heading */}
      <Reveal className="mx-auto mb-4 max-w-7xl px-5 text-center" stagger>
        <p className="eyebrow mb-3 inline-flex items-center gap-2.5 text-2xl font-semibold uppercase tracking-[0.2em] text-maroon sm:text-3xl">
          <span className="h-2 w-2 rounded-full bg-maroon shadow-[0_0_0_3px_rgba(185,32,37,0.18)]" />
          {lang === "hi" ? gallery.eyebrowHi : gallery.eyebrow}
        </p>
        <h2 className="font-display text-5xl font-bold tracking-tight text-ink sm:text-6xl lg:text-7xl">
          {lang === "hi" ? gallery.headingHi : gallery.heading}{" "}
          <em className="not-italic text-maroon">
            {lang === "hi" ? gallery.headingEmHi : gallery.headingEm}
          </em>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-ink-soft sm:text-base">
          {lang === "hi" ? gallery.subtitleHi : gallery.subtitle}
        </p>
      </Reveal>

      {/* ── Scroll-driven fan-out cluster ─────────────────────────────── */}
      <div
        ref={clusterRef}
        className="relative mx-auto mt-6 h-[130px] w-full max-w-7xl px-5 sm:h-[240px]"
        style={{ perspective: "1100px" }}
      >
        {fanCards.map((item: HomeGalleryItem, i: number) => {
          const f = FAN[i];
          const p = progress;
          // Outer transform: collapse → spread. Intro adds a drop + scale-in.
          // Card size scales with the same `spread` as the spacing, so the row
          // shrinks as one unit on narrow screens and never re-overlaps.
          const tx = f.x * spread * p;
          const ty = f.y * p + (shown ? 0 : -90);
          const rot = f.r * p + (shown ? 0 : 14);
          const scale = shown ? 1 : 0.7;
          const w = f.w * spread;
          const h = f.h * spread;
          return (
            <div
              key={item.id}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
              style={{
                width: w,
                height: h,
                zIndex: f.z,
                opacity: shown ? 1 : 0,
                transform: `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`,
                transition: shown
                  ? "opacity .9s cubic-bezier(.16,1,.3,1) 0ms, transform .15s linear 0ms"
                  : `opacity .8s ease ${i * 70}ms, transform 1s cubic-bezier(.16,1,.3,1) ${i * 70}ms`,
              }}
            >
              {/* Float layer — gentle idle bob, paused under reduced motion */}
              <div
                className="h-full w-full"
                style={
                  motion && shown
                    ? {
                        animation: `bp-float ${3 + (i % 4) * 0.5}s ease-in-out ${
                          i * 0.18
                        }s infinite`,
                      }
                    : undefined
                }
              >
                {/* Card — hover lift sits on its own layer to avoid clashing
                    with the float animation above it. */}
                <div className="group relative h-full w-full overflow-hidden rounded-2xl shadow-[0_22px_44px_-22px_rgba(0,0,0,0.6),0_8px_18px_-12px_rgba(0,0,0,0.4)] ring-1 ring-cream/60 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2 hover:scale-[1.04]">
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="220px"
                      className="object-cover"
                      unoptimized={isUnoptimized(item.image)}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
                  />
                  <span className="absolute inset-x-2 bottom-2 translate-y-1.5 rounded-lg bg-maroon/85 px-2.5 py-1.5 text-[11px] font-semibold text-cream opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {lang === "hi" ? item.titleHi : item.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA pill under the cluster */}
      <div className="mt-6 flex justify-center px-5">
        <Link
          href="/book"
          className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-[0_14px_24px_-8px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
        >
          {lang === "hi" ? gallery.ctaHi : gallery.cta}
          <span className="grid h-6 w-6 place-items-center rounded-full bg-maroon text-cream transition-transform duration-300 group-hover:rotate-45">
            →
          </span>
        </Link>
      </div>

      {/* ── Two slow auto-scrolling ribbons (top → L-to-R, bottom → R-to-L).
          Each track holds two copies so the -50% loop is seamless. Runs on
          every breakpoint; cards scale up on larger screens. */}
      <div className="mt-16 space-y-3 sm:mt-20 sm:space-y-4">
        {[
          { row: galleryItems.slice(0, 5), reverse: false },
          { row: galleryItems.slice(5), reverse: true },
        ].map(({ row, reverse }, idx) => (
          <div
            key={idx}
            className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]"
          >
            <div
              className="flex w-max gap-3 motion-reduce:!animate-none sm:gap-4"
              style={{
                animation: "bp-marquee 90s linear infinite",
                animationDirection: reverse ? "reverse" : "normal",
              }}
            >
              {[...row, ...row].map((item: HomeGalleryItem, i: number) => (
                <div
                  key={`${item.id}-${i}`}
                  className="group relative aspect-[4/5] w-36 shrink-0 overflow-hidden rounded-2xl ring-1 ring-cream/50 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.5)] sm:w-44 lg:w-52"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={i < row.length ? item.title : ""}
                      fill
                      sizes="(min-width:1024px) 208px, (min-width:640px) 176px, 144px"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                      unoptimized={isUnoptimized(item.image)}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3 sm:p-3.5">
                    <p className="text-xs font-semibold leading-snug text-cream drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] sm:text-sm">
                      {lang === "hi" ? item.titleHi : item.title}
                    </p>
                    <p className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-cream/70 sm:text-[10px]">
                      {lang === "hi" ? item.captionHi : item.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
