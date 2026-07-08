"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";
import { useHomeContent, type HomeTestimonial } from "@/lib/homeContent";
import type { StoredReview } from "@/app/api/reviews/route";

/** Shape a customer's submitted review into a testimonial card. Their words
 *  aren't translated, so both languages show the same quote/role. */
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

/** One representative review per order, newest first — reviews arrive per-vendor
 *  now, so an order with several rated vendors would otherwise flood the feed.
 *  Keep only reviews that carry a comment (empty ones make blank cards). */
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
  const { testimonials } = useHomeContent();
  // Real customer reviews, published immediately from My Bookings. Fetched on
  // mount so the curated seed renders first (SSR-safe) and reviews fill in.
  const [reviews, setReviews] = useState<HomeTestimonial[]>([]);

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

  // Newest real reviews lead the marquee, followed by the curated set.
  const items = [...reviews, ...testimonials.items];

  const renderCard = (t: HomeTestimonial, copy: number) => (
    <li
      key={`${copy}-${t.id}`}
      aria-hidden={copy === 1 ? true : undefined}
      className="card-lift group flex w-[85vw] shrink-0 flex-col rounded-card border border-cream-3 bg-white p-6 shadow-card hover:border-maroon/30 hover:shadow-pop sm:w-[360px]"
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
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-cream ring-2 ring-cream-3"
        >
          {initials(t.name)}
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
  );

  return (
    <section id="testimonials" className="mx-auto max-w-7xl px-5 py-16 sm:py-20 sm:px-8">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow mb-3 text-2xl font-semibold uppercase tracking-[0.2em] text-maroon sm:text-3xl">
          {lang === "hi" ? testimonials.eyebrowHi : testimonials.eyebrow}
        </p>
        <h2 className="font-display text-3xl text-maroon sm:text-4xl">
          {lang === "hi" ? testimonials.headingHi : testimonials.heading}
        </h2>
        <p className="font-script mt-4 text-[0.9375rem] text-ink-soft sm:text-lg">
          {lang === "hi" ? testimonials.subtitleHi : testimonials.subtitle}
        </p>
      </Reveal>

      <Reveal variant="up" className="mt-12">
        {/* Doubled track scrolls -50% for a seamless, very slow loop.
            Hover anywhere pauses it so the quote can be read in full. */}
        <div className="marquee-pause -mx-5 overflow-hidden px-5 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <ul className="animate-marquee-slow flex w-max gap-5 py-2 sm:gap-6">
            {[0, 1].map((copy) =>
              items.map((t) => renderCard(t, copy)),
            )}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
