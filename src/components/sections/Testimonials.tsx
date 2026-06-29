"use client";

import { useRef } from "react";
import Image from "next/image";
import { testimonials, type Testimonial } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span
      aria-label={label}
      className="flex items-center gap-0.5 text-gold"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < rating ? "" : "opacity-25"}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function Testimonials() {
  const { lang, t: tr } = useLang();
  const trackRef = useRef<HTMLUListElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onPointerDown(e: React.PointerEvent<HTMLUListElement>) {
    const track = trackRef.current;
    if (!track) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: track.scrollLeft,
      moved: false,
    };
    track.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLUListElement>) {
    const track = trackRef.current;
    if (!track || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    track.scrollLeft = drag.current.startScroll - dx;
  }

  function endDrag(e: React.PointerEvent<HTMLUListElement>) {
    const track = trackRef.current;
    drag.current.active = false;
    if (track?.hasPointerCapture(e.pointerId)) {
      track.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-xs font-semibold text-gold">
          {tr("Loved by Hosts", "मेज़बानों की पसंद")}
        </p>
        <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
          {tr("What Our Customers Say", "हमारे ग्राहक क्या कहते हैं")}
        </h2>
        <p className="font-script mt-4 text-xl text-ink-soft">
          {tr(
            "From weddings to corporate galas — thousands of celebrations served and remembered.",
            "शादियों से लेकर कॉर्पोरेट गाला तक — हज़ारों उत्सव परोसे और याद रखे गए।",
          )}
        </p>
      </Reveal>

      <Reveal variant="up" className="mt-12">
        <ul
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 sm:gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing select-none touch-pan-y"
        >
          {testimonials.map((t: Testimonial) => (
          <li
            key={t.id}
            className="card-lift group flex w-[85vw] shrink-0 snap-start flex-col rounded-2xl border border-cream-3 bg-white p-6 shadow-sm hover:border-maroon/30 hover:shadow-lg sm:w-[360px]"
          >
            <div className="flex items-center justify-between">
              <Stars
                rating={t.rating}
                label={tr(
                  `${t.rating} out of 5 stars`,
                  `5 में से ${t.rating} स्टार`,
                )}
              />
              <span
                aria-hidden="true"
                className="font-display text-4xl leading-none text-gold-soft transition-transform duration-300 group-hover:scale-110"
              >
                &ldquo;
              </span>
            </div>

            <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
              {lang === "hi" ? t.quoteHi : t.quote}
            </p>

            <div className="mt-6 flex items-center gap-3 border-t border-cream-3 pt-5">
              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-cream-3">
                <Image
                  src={t.avatar}
                  alt={t.name}
                  fill
                  sizes="44px"
                  className="object-cover"
                  draggable={false}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-ink">
                  {t.name}
                </span>
                <span className="block truncate text-xs text-ink-soft">
                  {lang === "hi" ? t.roleHi : t.role}
                </span>
              </span>
            </div>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
