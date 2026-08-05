"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicShell from "@/components/app/PublicShell";
import StickyBookingBar from "@/components/StickyBookingBar";
import VendorActionRow from "@/components/vendors/VendorActionRow";
import BainaBoxOrderPanel from "@/components/vendors/BainaBoxOrderPanel";
import CompareTray from "@/components/vendors/CompareTray";
import { useCompare } from "@/lib/compare";
import { openCompareTable } from "@/lib/compareTray";
import { useLang } from "@/lib/i18n";
import { AppBar } from "@/components/ui";
import { BAINA_BOX_VENDOR_DATA, type BainaBoxVendorData } from "@/lib/bainaBoxData";

export default function BainaBoxDetail({
  data,
}: {
  data: BainaBoxVendorData;
}) {
  const { t } = useLang();
  const { has, toggle, isFull, count: compareCount } = useCompare();

  const inCompare = has(data.vendorId);
  const compareDisabled = !inCompare && isFull;

  const bookHref = "#baina-order";

  const photos = useMemo(
    () => [data.heroImage, ...(data.gallery ?? []).filter((g) => g !== data.heroImage)],
    [data.heroImage, data.gallery],
  );

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);

  const defaultProduct = useMemo(() => {
    return (
      data.products.find((p) => p.price === data.fixedPrice) ??
      data.products[0]
    );
  }, [data.products, data.fixedPrice]);

  const [qty, setQty] = useState<Record<string, number>>({});

  const primaryQty = defaultProduct ? (qty[defaultProduct.id] ?? 0) : 0;

  const handlePrimaryQtyChange = (next: number) => {
    if (!defaultProduct) return;
    setQty((prev) => ({
      ...prev,
      [defaultProduct.id]: next,
    }));
  };

  const otherVendors = useMemo(
    () => Object.values(BAINA_BOX_VENDOR_DATA).filter((v) => v.slug !== data.slug),
    [data.slug],
  );

  // Icon map for "Best For" items
  const bestForIcon = (item: string) => {
    const lower = item.toLowerCase();
    if (lower.includes("wedding")) return "💍";
    if (lower.includes("gift")) return "🎁";
    if (lower.includes("festival")) return "🎆";
    if (lower.includes("home") || lower.includes("function")) return "🏠";
    if (lower.includes("party")) return "🎉";
    if (lower.includes("corporate")) return "💼";
    return "✨";
  };

  return (
    <PublicShell detail>
      <section className="app-bottom-safe mx-auto max-w-6xl sm:px-5 sm:py-6 lg:py-10">
        {/* Sticky top header bar */}
        <AppBar
          title={data.name}
          subtitle={data.location}
          backHref="/"
          className="mb-2 sm:rounded-b-hero"
        />

        <div className="mt-2 grid gap-6 px-4 lg:mt-4 lg:grid-cols-[1fr_1.1fr] lg:gap-8 lg:px-0">
          {/* ── Left: Showcase Photo / Carousel ────────────────────── */}
          <div>
            <div className="relative -mx-4 aspect-[4/3] w-[calc(100%+2rem)] overflow-hidden bg-cream sm:mx-0 sm:w-full sm:rounded-hero sm:border sm:border-maroon/6 sm:shadow-card">
              <Image
                src={photos[activePhotoIdx] || data.heroImage}
                alt={data.name}
                fill
                priority
                sizes="(min-width: 1024px) 550px, 100vw"
                className="object-cover"
              />

              {/* Verified badge top-left */}
              {data.verified && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-maroon px-2.5 py-1 text-[11px] font-bold text-white shadow-sm sm:left-4 sm:top-4 sm:px-3 sm:text-xs">
                  <span aria-hidden="true">✓</span> {t("VERIFIED", "वेरिफाइड")}
                </span>
              )}

              {/* Gallery button bottom-left */}
              {photos.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev + 1) % photos.length)
                  }
                  className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink shadow-md backdrop-blur-sm transition hover:bg-white sm:bottom-4 sm:left-4"
                >
                  <span>🖼️</span>
                  <span>
                    {t("View Gallery", "गैलरी देखें")} ({photos.length})
                  </span>
                </button>
              )}
            </div>

            {/* Thumbnail dots if multiple photos */}
            {photos.length > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                {photos.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActivePhotoIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all ${
                      i === activePhotoIdx ? "w-6 bg-maroon" : "w-2.5 bg-cream-3"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Header details, pricing & lists ─────────────── */}
          <div>
            {/* Logo + Title + Wishlist */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {data.logoImage && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-maroon/15 shadow-sm">
                    <Image
                      src={data.logoImage}
                      alt={data.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    {data.name}
                  </h1>
                  {data.nameHi && (
                    <p className="text-xs text-ink-soft">{data.nameHi}</p>
                  )}
                </div>
              </div>

              {/* Wishlist Heart button */}
              <button
                type="button"
                onClick={() => setWishlisted((v) => !v)}
                aria-label="Wishlist"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cream-3 bg-white text-ink shadow-sm transition active:scale-95 hover:bg-cream-2"
              >
                <span className={`text-lg ${wishlisted ? "text-maroon" : "text-ink-soft"}`}>
                  {wishlisted ? "♥" : "♡"}
                </span>
              </button>
            </div>

            {/* Rating & Reviews */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 font-bold text-maroon">
                <span className="text-amber-500">★</span>
                <span>{data.rating}</span>
              </div>
              <span className="text-ink-soft">
                ({data.reviews} {t("Reviews", "समीक्षाएँ")})
              </span>
            </div>

            {/* Location */}
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <span className="text-maroon">📍</span>
              <span>{data.location}</span>
            </p>

            {/* Tags */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    tag === "Veg"
                      ? "border border-maroon bg-white text-maroon"
                      : tag === "Baina Boxes"
                      ? "bg-cream-3 text-maroon"
                      : "bg-cream-2 text-ink-soft"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Price Box */}
            <div className="mt-5 rounded-2xl border border-maroon/10 bg-cream/40 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-maroon/80">
                {t("Fixed Price", "निश्चित मूल्य")}
              </p>
              <p className="mt-1 font-display text-3xl font-bold text-maroon">
                ₹{data.fixedPrice.toLocaleString("en-IN")}{" "}
                <span className="text-base font-normal text-ink-soft">
                  / {data.priceUnit}
                </span>
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {t(
                  "All inclusive • No hidden charges",
                  "सब कुछ शामिल • कोई छिपा हुआ शुल्क नहीं",
                )}
              </p>
            </div>

            {/* 2-column: Best For + Why Choose */}
            <div className="mt-5 grid grid-cols-1 gap-5 border-t border-cream-3 pt-5 min-[480px]:grid-cols-2">
              {/* Best For */}
              <div>
                <h3 className="font-display text-base font-bold text-maroon">
                  {t("Best For", "उपयुक्त")}
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-ink-soft">
                  {data.bestFor.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="text-base">{bestForIcon(item)}</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Why Choose {name}? */}
              <div>
                <h3 className="font-display text-base font-bold text-maroon">
                  {t(`Why Choose ${data.name}?`, `${data.name} क्यों चुनें?`)}
                </h3>
                <ul className="mt-2.5 space-y-2 text-sm text-ink-soft">
                  {data.whyChoose.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-maroon/10 text-xs font-bold text-maroon">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="mt-6">
              <VendorActionRow
                bookHref={bookHref}
                vendorName={data.name}
                vendorCity={data.location}
                priceFrom={data.fixedPrice}
                inCompare={inCompare}
                compareDisabled={compareDisabled}
                onToggleCompare={() => toggle(data.vendorId)}
                quantity={primaryQty}
                onQuantityChange={handlePrimaryQtyChange}
              />
            </div>

            {/* Compare banner link if 2+ selected */}
            {compareCount >= 2 && (
              <button
                type="button"
                onClick={openCompareTable}
                className="mt-3 block w-full text-center text-sm font-semibold text-maroon hover:underline"
              >
                {t(
                  `Compare ${compareCount} selected →`,
                  `${compareCount} चुने हुए की तुलना करें →`,
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Order Sweets & Boxes — per-box ordering (qty → date → confirm).
            The feast wizard hand-off above stays for full catering; this panel
            is how a box order actually completes. ── */}
        <BainaBoxOrderPanel data={data} qty={qty} setQty={setQty} />

        {/* ── Explore Other Sweet Houses ── */}
        {otherVendors.length > 0 && (
          <div className="mt-14 border-t border-cream-3 pt-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">
                {t("Explore Other Sweet Houses", "अन्य मिठाई घर देखें")}
              </h2>
              <Link
                href="/baina-box"
                className="text-xs font-semibold text-maroon transition hover:underline sm:text-sm"
              >
                {t("View All →", "सभी देखें →")}
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {otherVendors.map((v) => (
                <Link
                  key={v.slug}
                  href={`/baina-box/${v.slug}`}
                  className="group flex items-center gap-3.5 rounded-2xl border border-cream-3 bg-white p-3.5 shadow-sm transition hover:border-maroon/20 hover:shadow-card"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream">
                    <Image
                      src={v.heroImage}
                      alt={v.name}
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base font-bold text-ink transition-colors group-hover:text-maroon">
                      {v.name}
                    </h3>
                    <p className="text-xs text-ink-soft">{v.location}</p>
                    <p className="mt-1 font-display text-sm font-bold text-maroon">
                      ₹{v.fixedPrice.toLocaleString("en-IN")}{" "}
                      <span className="text-[11px] font-normal text-ink-soft">
                        / {v.priceUnit}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-maroon transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <CompareTray />

        {/* Mobile sticky booking bar — jumps to the on-page box order panel
            (the catering wizard stays reachable via the action row's Book Now). */}
        <StickyBookingBar
          price={`₹${data.fixedPrice.toLocaleString("en-IN")}`}
          priceNote={t("per Box", "प्रति डिब्बा")}
          cta={t("Order Boxes", "डिब्बे ऑर्डर करें")}
          href="#baina-order"
        />
      </section>
    </PublicShell>
  );
}
