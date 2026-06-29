"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { galleryItems, type GalleryItem } from "@/lib/data";
import { useLang } from "@/lib/i18n";

/**
 * Fan layout for the seven cards in the scroll-driven cluster. Each entry is
 * the card's *fully fanned* offset from centre (px), its tilt (deg) and size.
 * At scroll-progress 0 every card is collapsed onto the centre (a neat stack);
 * as the section scrolls into view the offsets ease to 100%, fanning the cards
 * out into an arc — the signature move from the mockup, rebuilt without GSAP.
 */
const FAN = [
  { x: -360, y: 40, r: -16, w: 150, h: 202, z: 1 },
  { x: -245, y: -6, r: -10, w: 168, h: 226, z: 2 },
  { x: -128, y: 30, r: -5, w: 188, h: 250, z: 3 },
  { x: 0, y: -18, r: 0, w: 212, h: 284, z: 5 },
  { x: 128, y: 30, r: 5, w: 188, h: 250, z: 3 },
  { x: 245, y: -6, r: 10, w: 168, h: 226, z: 2 },
  { x: 360, y: 40, r: 16, w: 150, h: 202, z: 1 },
];

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export default function Gallery() {
  const { lang, t } = useLang();
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
      setSpread(clamp(rect.width / 920, 0.34, 1));
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
      {/* Soft maroon glow blooming behind the cluster */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(185,32,37,0.16),transparent_62%)] blur-2xl"
      />

      {/* Heading */}
      <Reveal className="mx-auto mb-4 max-w-7xl px-5 text-center" stagger>
        <p className="eyebrow mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-maroon">
          <span className="h-1.5 w-1.5 rounded-full bg-maroon shadow-[0_0_0_3px_rgba(185,32,37,0.18)]" />
          {t("Real Events", "असली इवेंट")}
        </p>
        <h2 className="font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:text-6xl">
          {t("Feasts we've", "जो भोज हमने")}{" "}
          <em className="not-italic text-maroon">{t("brought to life", "साकार किए")}</em>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-ink-soft sm:text-base">
          {t(
            "A glimpse from real weddings, corporate galas and house parties — plated, served and celebrated by our specialists.",
            "असली शादियों, कॉर्पोरेट गाला और हाउस पार्टियों की एक झलक — हमारे स्पेशलिस्ट द्वारा परोसी और मनाई गई।",
          )}
        </p>
      </Reveal>

      {/* ── Scroll-driven fan-out cluster ─────────────────────────────── */}
      <div
        ref={clusterRef}
        className="relative mx-auto mt-10 h-[320px] w-full max-w-6xl px-5 sm:h-[360px]"
        style={{ perspective: "1100px" }}
      >
        {fanCards.map((item: GalleryItem, i: number) => {
          const f = FAN[i];
          const p = progress;
          // Outer transform: collapse → fan. Intro adds a drop + scale-in.
          const tx = f.x * spread * p;
          const ty = f.y * p + (shown ? 0 : -90);
          const rot = f.r * p + (shown ? 0 : 14);
          const scale = shown ? 1 : 0.7;
          return (
            <div
              key={item.title}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 will-change-transform"
              style={{
                width: f.w,
                height: f.h,
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
                <div className="group relative h-full w-full overflow-hidden rounded-2xl shadow-[0_30px_50px_-16px_rgba(185,32,37,0.45),0_10px_22px_-8px_rgba(185,32,37,0.3)] ring-1 ring-cream-3/40 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2 hover:scale-[1.05]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="220px"
                    className="object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/15"
                  />
                  <span className="absolute inset-x-2 bottom-2 translate-y-1.5 rounded-lg bg-black/55 px-2.5 py-1.5 text-[11px] font-semibold text-cream opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    {lang === "hi" ? item.titleHi : item.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA pill under the cluster */}
      <div className="mt-8 flex justify-center px-5">
        <Link
          href="/book"
          className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream shadow-[0_14px_24px_-8px_rgba(0,0,0,0.4)] transition-transform duration-300 hover:-translate-y-0.5 active:scale-95"
        >
          {t("Plan your feast", "अपना भोज प्लान करें")}
          <span className="grid h-6 w-6 place-items-center rounded-full bg-maroon text-cream transition-transform duration-300 group-hover:rotate-45">
            →
          </span>
        </Link>
      </div>

      {/* ── Staggered gallery grid ────────────────────────────────────── */}
      <Reveal
        as="ul"
        stagger
        from="up"
        className="mt-20 grid w-full grid-cols-2 gap-2 px-2 sm:grid-cols-3 sm:gap-3 sm:px-3 lg:grid-cols-5 lg:px-4"
      >
        {galleryItems.map((item: GalleryItem) => (
          <li
            key={item.title}
            className="group relative aspect-[3/4] overflow-hidden rounded-2xl ring-1 ring-cream-3/50 shadow-[0_16px_30px_-18px_rgba(185,32,37,0.4)] transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-2"
          >
            <Image
              src={item.image}
              alt={item.title}
              fill
              sizes="(min-width:1024px) 19vw, (min-width:640px) 31vw, 46vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100"
            />
            {/* Hover meta — slides up like the mockup's .t-meta overlay */}
            <div className="absolute inset-x-3 bottom-3 translate-y-2 rounded-xl border border-white/15 bg-black/55 px-3 py-2.5 text-cream opacity-0 backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0 group-hover:opacity-100">
              <p className="text-sm font-bold leading-tight">
                {lang === "hi" ? item.titleHi : item.title}
              </p>
              <p className="mt-0.5 text-[11px] tracking-wide text-cream/70">
                {lang === "hi" ? item.captionHi : item.caption}
              </p>
            </div>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
