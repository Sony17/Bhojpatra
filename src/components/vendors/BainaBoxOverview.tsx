"use client";

import Image from "next/image";
import Link from "next/link";
import PublicShell from "@/components/app/PublicShell";
import CompareTray from "@/components/vendors/CompareTray";
import BainaBoxSpecial from "@/components/BainaBoxSpecial";
import { useLang } from "@/lib/i18n";
import { Button, Badge } from "@/components/ui";
import { BAINA_BOX_VENDOR_DATA, type BainaBoxVendorData } from "@/lib/bainaBoxData";

export default function BainaBoxOverview() {
  const { t } = useLang();
  const vendors: BainaBoxVendorData[] = Object.values(BAINA_BOX_VENDOR_DATA);

  return (
    <PublicShell>
      <section className="app-bottom-safe mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Banner / Header */}
        <div className="rounded-2xl border border-cream-3 bg-cream/40 p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-4xl">
            {t("Baina Box & Sweet Box Marketplace", "बैना बॉक्स और मिठाई मार्केटप्लेस")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
            {t(
              "Explore premium Baina Boxes, mithai gift hampers, and bhaji packaging from Lucknow's most famous iconic sweet houses.",
              "लखनऊ के सबसे प्रसिद्ध मिठाई घरों से प्रीमियम बैना बॉक्स, मिठाई उपहार हैम्पर्स और भाजी पैकेजिंग देखें।",
            )}
          </p>
        </div>

        {/* Featured Bhojpatra Special Banner */}
        <div className="mt-6">
          <BainaBoxSpecial variant="search" />
        </div>

        {/* Vendor Grid Header */}
        <div className="mt-8 flex items-center justify-between px-1">
          <p className="text-sm text-ink-soft">
            <span className="font-bold text-ink">{vendors.length}</span>{" "}
            {t("Iconic Sweet Houses", "प्रसिद्ध मिठाई घर")}
          </p>
        </div>

        {/* Vendor Grid */}
        <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <Link
              key={vendor.slug}
              href={`/baina-box/${vendor.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-maroon/20 hover:shadow-card"
            >
              {/* Main Image */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
                <Image
                  src={vendor.heroImage}
                  alt={vendor.name}
                  fill
                  sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Verified Badge */}
                {vendor.verified && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-maroon px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    <span aria-hidden="true">✓</span> {t("VERIFIED", "वेरिफाइड")}
                  </span>
                )}

                {/* Rating Badge */}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink shadow-sm backdrop-blur-sm">
                  <span className="text-amber-500">★</span>
                  <span>{vendor.rating}</span>
                  <span className="font-normal text-ink-soft">
                    ({vendor.reviews})
                  </span>
                </span>
              </div>

              {/* Vendor Body */}
              <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-maroon">
                        {vendor.name}
                      </h2>
                      {vendor.nameHi && (
                        <p className="text-xs text-ink-soft">{vendor.nameHi}</p>
                      )}
                    </div>

                    {/* Logo Avatar */}
                    {vendor.logoImage && (
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-maroon/15">
                        <Image
                          src={vendor.logoImage}
                          alt={vendor.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
                    <span className="text-maroon">📍</span>
                    <span>{vendor.location}</span>
                  </p>

                  {/* Tags */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {vendor.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-cream px-2.5 py-0.5 text-[11px] font-medium text-ink-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Best For */}
                  <p className="mt-3 text-xs text-ink-soft">
                    <span className="font-semibold text-ink">
                      {t("Best For", "उपयुक्त")}:
                    </span>{" "}
                    {vendor.bestFor.slice(0, 3).join(" · ")}
                  </p>
                </div>

                {/* Price & Action */}
                <div className="mt-5 border-t border-cream-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-ink-soft">
                        {t("Starting from", "शुरुआती कीमत")}
                      </p>
                      <p className="font-display text-lg font-bold text-maroon">
                        ₹{vendor.fixedPrice.toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal text-ink-soft">
                          / {vendor.priceUnit}
                        </span>
                      </p>
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="group-hover:bg-maroon group-hover:text-white transition-colors"
                    >
                      {t("View Baina Boxes →", "बैना बॉक्स देखें →")}
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <CompareTray />
      </section>
    </PublicShell>
  );
}
