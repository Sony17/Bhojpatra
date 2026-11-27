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

/**
 * `compact`: three reviews in one still row with arrows to page through the
 * rest (used by /home-recreate). Otherwise the long scrolling ribbon.
 */
export default function Testimonials({ compact = false }: { compact?: boolean }) {
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
  const PAGE = 3;
  const pages = Math.max(1, Math.ceil(items.length / PAGE));
  const [page, setPage] = useState(0);
  const shown = items.slice(page * PAGE, page * PAGE + PAGE);

  const renderCard = (t: HomeTestimonial, copy: number) => (
    <li
      key={`${copy}-${t.id}`}
      aria-hidden={copy === 1 ? true : undefined}
      className="card-lift group flex w-[60vw] shrink-0 flex-col overflow-hidden rounded-card border border-maroon/8 bg-white shadow-card hover:border-maroon/20 hover:shadow-pop sm:w-[266px]"
    >
      <div className="flex flex-1 flex-col p-5 sm:p-6">
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
            className="font-display text-2xl leading-none text-cream transition-transform duration-300 group-hover:scale-110"
          >
            &ldquo;
          </span>
        </div>

        <p className="mt-3 flex-1 text-xs leading-relaxed text-ink/75 sm:text-sm">
          {lang === "hi" ? t.quoteHi : t.quote}
        </p>

        <div className="mt-4 flex items-center gap-2.5 border-t border-maroon/10 pt-4">
          <span
            aria-hidden="true"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-maroon text-xs font-semibold text-cream ring-1 ring-maroon/15"
          >
            {t.avatar ? (
              <Image
                src={t.avatar}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
                unoptimized={isUnoptimized(t.avatar)}
              />
            ) : (
              initials(t.name)
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold leading-tight text-ink">
              {t.name}
            </span>
            <span className="block text-xs leading-tight text-ink/55">
              {lang === "hi" ? t.roleHi : t.role}
            </span>
          </span>
        </div>
      </div>
    </li>
  );

  return (
    <section id="testimonials" className={"relative overflow-hidden bg-white " + (compact ? "py-10 sm:py-14" : "py-16 sm:py-20")}>
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

      {compact ? (
        <div className="relative mx-auto mt-8 max-w-6xl px-4 sm:mt-10 sm:px-6">
          <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {shown.map((item) => (
              <CompactCard key={item.id} item={item} />
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <PageArrow dir="prev" disabled={page === 0} onClick={() => setPage((p) => p - 1)} label={tr("Previous reviews", "पिछले रिव्यू")} />
              <span className="min-w-[3.5rem] text-center text-sm font-semibold tabular-nums text-ink/70" aria-live="polite">
                {page + 1} / {pages}
              </span>
              <PageArrow dir="next" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} label={tr("More reviews", "और रिव्यू")} />
            </div>
          )}
        </div>
      ) : (
      <Reveal variant="up" className="relative mt-10 sm:mt-12">
        <div className="marquee-pause overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
          <ul className="animate-marquee-slow flex w-max gap-3.5 px-5 py-2 sm:gap-4 sm:px-8">
            {[0, 1].map((copy) => items.map((t) => renderCard(t, copy)))}
          </ul>
        </div>
      </Reveal>
      )}
    </section>
  );
}

/** Food-app style review card: rating chip, name and occasion, then the quote. */
function CompactCard({ item }: { item: HomeTestimonial }) {
  const { lang, t } = useLang();
  return (
    <li className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-16px_rgba(0,0,0,0.18)] sm:w-auto sm:max-w-none">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-maroon text-xs font-semibold text-cream"
        >
          {item.avatar ? (
            <Image src={item.avatar} alt="" fill sizes="40px" className="object-cover" unoptimized={isUnoptimized(item.avatar)} />
          ) : (
            initials(item.name)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{item.name}</span>
          <span className="block truncate text-xs text-ink/55">{lang === "hi" ? item.roleHi : item.role}</span>
        </span>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-maroon px-2 py-1 text-xs font-bold text-white"
          aria-label={t(`${item.rating} out of 5 stars`, `5 में से ${item.rating} स्टार`)}
        >
          {item.rating}
          <span aria-hidden="true">★</span>
        </span>
      </div>
      <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink/75">{lang === "hi" ? item.quoteHi : item.quote}</p>
    </li>
  );
}

function PageArrow({ dir, disabled, onClick, label }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-maroon/30 bg-white text-maroon transition-colors hover:bg-maroon hover:text-white disabled:pointer-events-none disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
        <path d={dir === "prev" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
