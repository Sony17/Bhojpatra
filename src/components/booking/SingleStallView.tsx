"use client";

import Image from "next/image";
import type { VendorSingleStallMenu } from "@/lib/vendorMenus";
import type { CategoryVendor } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { inr } from "@/lib/money";
import { Card, Badge } from "@/components/ui";

interface SingleStallViewProps {
  vendor: CategoryVendor;
  singleStallMenu: VendorSingleStallMenu;
}

export default function SingleStallView({
  vendor,
  singleStallMenu,
}: SingleStallViewProps) {
  const { t } = useLang();

  return (
    <div className="w-full space-y-6">
      {/* Customer Guidance Banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-maroon/20 bg-cream/40 p-4 text-xs text-ink sm:text-sm">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-base shadow-xs">
          🎪
        </span>
        <p className="leading-relaxed">
          <span className="font-bold text-maroon">
            {t("Fixed Stall Package", "फिक्स्ड स्टॉल पैकेज")}:
          </span>{" "}
          {t(
            "This is a fixed menu curated by the caterer. All listed dishes are included in your per-guest rate.",
            "यह कैटरर द्वारा तैयार किया गया फिक्स्ड मेन्यू है। सभी सूचीबद्ध व्यंजन आपकी प्रति-मेहमान दर में शामिल हैं।",
          )}
        </p>
      </div>

      <Card padding="none" className="overflow-hidden p-5 sm:p-7">
        {/* Cover Photo / Fallback Banner */}
        {singleStallMenu.coverPhoto ? (
          <div className="relative mb-6 aspect-[21/9] w-full overflow-hidden rounded-xl bg-cream sm:aspect-[3/1]">
            <Image
              src={singleStallMenu.coverPhoto}
              alt={singleStallMenu.title}
              fill
              unoptimized
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-3 bg-gradient-to-r from-maroon/10 via-cream-2 to-cream/40 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-xs">
                🎪
              </span>
              <div>
                <span className="inline-block rounded-full bg-maroon/10 px-2.5 py-0.5 text-[11px] font-semibold text-maroon">
                  {t("Fixed Stall Package", "फिक्स्ड स्टॉल पैकेज")}
                </span>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {t(
                    "Live stall setup with all dishes included in a single per-guest rate.",
                    "एक ही प्रति-मेहमान दर में शामिल सभी व्यंजनों के साथ लाइव स्टॉल सेटअप।",
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Title, Vendor & Pricing Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-xl font-bold text-ink sm:text-2xl">
                {singleStallMenu.title}
              </h3>
              <Badge tone="soft">
                {vendor.name}
              </Badge>
            </div>
            {singleStallMenu.description && (
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {singleStallMenu.description}
              </p>
            )}
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <p className="font-display text-2xl font-bold text-maroon">
              ₹{inr.format(singleStallMenu.pricePerGuest)}
              <span className="text-sm font-normal text-ink-soft">
                {" "}
                / {t("guest", "मेहमान")}
              </span>
            </p>
            {singleStallMenu.minGuests != null && singleStallMenu.minGuests > 0 && (
              <p className="mt-1 text-xs font-semibold text-ink-soft">
                {t(
                  `Min. ${singleStallMenu.minGuests} guests`,
                  `न्यूनतम ${singleStallMenu.minGuests} मेहमान`,
                )}
              </p>
            )}
          </div>
        </div>

        {/* Included Dishes Grid */}
        {singleStallMenu.items.length > 0 && (
          <div className="mt-6 border-t border-cream-3 pt-6">
            <h4 className="font-display text-base font-semibold text-ink">
              {t("Included Dishes", "शामिल डिश")} ({singleStallMenu.items.length})
            </h4>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {singleStallMenu.items.map((item, idx) => {
                const isVeg = item.diet === "veg";
                const isNonVeg = item.diet === "non-veg";

                return (
                  <div
                    key={`${item.name}-${idx}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-cream-3 bg-cream/20 p-3.5 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {(isVeg || isNonVeg) && (
                          <span
                            className={
                              "inline-block h-3 w-3 shrink-0 rounded-xs border " +
                              (isVeg
                                ? "border-maroon bg-white"
                                : "border-maroon bg-maroon")
                            }
                            title={isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          />
                        )}
                        <p className="truncate text-sm font-semibold text-ink">
                          {item.name}
                        </p>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 truncate text-xs text-ink-soft">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {item.price != null && item.price > 0 && (
                      <span className="shrink-0 font-display text-sm font-bold text-maroon" title="Individual item price (informational only)">
                        ₹{inr.format(item.price)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
