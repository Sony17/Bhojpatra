"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import { useLang } from "@/lib/i18n";
import {
  useHomeContent,
  isUnoptimized,
  type HomeTestimonial,
} from "@/lib/homeContent";
import type { StoredReview } from "@/app/api/reviews/route";

/** Shape a customer's submitted review into a testimonial card. */
function reviewToTestimonial(r: StoredReview): HomeTestimonial {
  const role = [r.occasion, r.city].filter(Boolean).join(" · ");
  return {
    id: `rev-${r.id ?? r.bookingId}`,
    name: r.name,
    role,
    roleHi: role,
    quote: r.comment,
    quoteHi: r.comment,
    rating: r.rating,
  };
}

/** One representative review per order, newest first. */
function representativeReviews(reviews: StoredReview[]): StoredReview[] {
  const seen = new Set<string>();
  const out: StoredReview[] = [];
  for (const r of reviews) {
    if (!r.comment?.trim()) continue;
    if (seen.has(r.bookingId)) continue;
    seen.add(r.bookingId);
    out.push(r);
  }
  return out;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <span aria-label={label} className="flex items-center gap-0.5 text-maroon">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={i < rating ? "" : "opacity-25"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

export default function Testimonials() {
  const { lang, t: tr } = useLang();
  const { testimonials, gallery } = useHomeContent();
  const [reviews, setReviews] = useState<HomeTestimonial[]>([]);
  const atmosphere = gallery.cluster[0]?.image ?? gallery.rowOne[0]?.image;

  useEffect(() => {
    let live = true;
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { reviews?: StoredReview[] } | null) => {
        if (live && data?.reviews) {
          setReviews(
            representativeReviews(data.reviews).map(reviewToTestimonial),
          );
        }
      })
      .catch(() => {
        /* offline / no backend — keep the curated testimonials */
      });
    return () => {
      live = false;
    };
  }, []);

  const items = [...reviews, ...testimonials.items];

  const renderCard = (t: HomeTestimonial, copy: number) => (
    <li
      key={`${copy}-${t.id}`}
      aria-hidden={copy === 1 ? true : undefined}
      className="card-lift group flex w-[85vw] shrink-0 flex-col overflow-hidden rounded-card border border-maroon/8 bg-white shadow-card hover:border-maroon/20 hover:shadow-pop sm:w-[380px]"
    >
      <div className="flex flex-1 flex-col p-7 sm:p-8">
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
            className="font-display text-4xl leading-none text-cream transition-transform duration-300 group-hover:scale-110"
          >
            &ldquo;
          </span>
        </div>

        <p className="mt-4 flex-1 text-sm leading-relaxed text-ink/75 sm:text-[15px]">
          {lang === "hi" ? t.quoteHi : t.quote}
        </p>

        <div className="mt-6 flex items-center gap-3 border-t border-maroon/10 pt-5">
          <span
            aria-hidden="true"
            className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-maroon text-sm font-semibold text-cream ring-1 ring-maroon/15"
          >
            {t.avatar ? (
              <Image
                src={t.avatar}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
                unoptimized={isUnoptimized(t.avatar)}
              />
            ) : (
              initials(t.name)
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-ink">
              {t.name}
            </span>
            <span className="block truncate text-xs text-ink/55">
              {lang === "hi" ? t.roleHi : t.role}
            </span>
          </span>
        </div>
      </div>
    </li>
  );

  return (
    <section id="testimonials" className="relative overflow-hidden bg-white py-16 sm:py-20">
      {atmosphere ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
        >
          <Image
            src={atmosphere}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            unoptimized={isUnoptimized(atmosphere)}
          />
          <span className="absolute inset-0 bg-gradient-to-b from-white via-white/85 to-white" />
        </div>
      ) : null}

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <SectionIntro
            eyebrow={lang === "hi" ? testimonials.eyebrowHi : testimonials.eyebrow}
            title={lang === "hi" ? testimonials.headingHi : testimonials.heading}
            subtitle={
              lang === "hi" ? testimonials.subtitleHi : testimonials.subtitle
            }
          />
        </Reveal>
      </div>

      <Reveal variant="up" className="relative mt-10 sm:mt-12">
        <div className="marquee-pause overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <ul className="animate-marquee-slow flex w-max gap-5 px-5 py-2 sm:gap-6 sm:px-8">
            {[0, 1].map((copy) => items.map((t) => renderCard(t, copy)))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
