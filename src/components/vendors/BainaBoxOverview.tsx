"use client";

import Image from "next/image";
import Link from "next/link";
import PublicShell from "@/components/app/PublicShell";
import CompareTray from "@/components/vendors/CompareTray";
import BainaBoxSpecial from "@/components/BainaBoxSpecial";
import { useLang } from "@/lib/i18n";
import { Button, EmptyState, SkeletonList } from "@/components/ui";
import { listingCateringCategories } from "@/lib/data";
import { photoNeedsUnoptimized } from "@/lib/photoLinks";
import { useAllVendorsStatus } from "@/lib/useAllVendors";

/** Every vendor who declared the Baina Box category — boxes are ordered from
 *  the panel on their profile. */
export default function BainaBoxOverview() {
  const { t } = useLang();
  const { vendors: all, loaded } = useAllVendorsStatus();
  const vendors = all.filter((v) =>
    listingCateringCategories(v).includes("baina-box"),
  );

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
        {loaded && vendors.length > 0 && (
          <div className="mt-8 flex items-center justify-between px-1">
            <p className="text-sm text-ink-soft">
              <span className="font-bold text-ink">{vendors.length}</span>{" "}
              {vendors.length === 1
                ? t("Sweet House", "मिठाई घर")
                : t("Sweet Houses", "मिठाई घर")}
            </p>
          </div>
        )}

        {!loaded ? (
          <div className="mt-8">
            <SkeletonList />
          </div>
        ) : vendors.length === 0 ? (
          <EmptyState
            className="mt-8"
            icon="🎁"
            title={t("Baina Boxes coming soon", "बैना बॉक्स जल्द आ रहे हैं")}
            message={t(
              "Sweet houses are joining Bhojpatra — check back soon.",
              "मिठाई घर भोजपत्र से जुड़ रहे हैं — जल्द ही देखें।",
            )}
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}#baina-order`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-maroon/20 hover:shadow-card"
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-cream">
                  {vendor.image && (
                    <Image
                      src={vendor.image}
                      alt={vendor.name}
                      fill
                      sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      unoptimized={photoNeedsUnoptimized(vendor.image)}
                    />
                  )}
                  {vendor.verified && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-maroon px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                      <span aria-hidden="true">✓</span> {t("VERIFIED", "वेरिफाइड")}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight text-ink transition-colors group-hover:text-maroon">
                      {vendor.name}
                    </h2>
                    <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
                      <span className="text-maroon">📍</span>
                      <span>{vendor.city}</span>
                    </p>
                  </div>

                  <div className="mt-5 flex justify-end border-t border-cream-3 pt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="group-hover:bg-maroon group-hover:text-white transition-colors"
                    >
                      {t("View Baina Boxes →", "बैना बॉक्स देखें →")}
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <CompareTray />
      </section>
    </PublicShell>
  );
}
