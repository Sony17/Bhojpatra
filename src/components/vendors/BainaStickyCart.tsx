"use client";

import { usePathname } from "next/navigation";
import { useBainaCart, resolveBainaCartSummary } from "@/lib/bainaCart";
import { useCompareTrayState } from "@/lib/compareTray";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui";

/**
 * Persistent sticky Baina cart dock shown at the bottom of the viewport
 * while browsing the catalogue or the "View All" Baina marketplace.
 * Displays active vendor, item count, total boxes, and live order total.
 * Clicking "View Order →" scrolls or navigates to the active vendor's order panel.
 */
export default function BainaStickyCart() {
  const { t } = useLang();
  const cart = useBainaCart();
  const compareTray = useCompareTrayState();
  const pathname = usePathname();

  const { vendor, itemCount, totalBoxes, totalAmount } = resolveBainaCartSummary(cart);

  // Hidden when no boxes are in the order or when CompareTray is active
  if (!cart || !vendor || totalBoxes === 0 || compareTray.visible) {
    return null;
  }

  const isCurrentVendorPage = pathname === `/baina-box/${cart.vendorSlug}`;
  const targetHref = `/baina-box/${cart.vendorSlug}#baina-order`;

  const handleViewOrder = () => {
    if (isCurrentVendorPage && typeof document !== "undefined") {
      const el = document.getElementById("baina-order");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <aside
      aria-label={t("Your Baina Order", "आपका बैना ऑर्डर")}
      className="app-sticky-cta pointer-events-none z-40"
    >
      <div className="pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-sheet border border-maroon/15 bg-white/96 px-4 py-2.5 shadow-pop-up backdrop-blur-xl">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-ink-soft">
            <span className="font-bold text-maroon">{vendor.name}</span>
            <span className="mx-1.5 text-cream-3" aria-hidden="true">|</span>
            <span>
              {itemCount} {itemCount === 1 ? t("item", "आइटम") : t("items", "आइटम")}
            </span>
            <span className="mx-1 text-ink-soft/40">·</span>
            <span className="font-semibold text-ink">
              {totalBoxes} {totalBoxes === 1 ? t("box", "डिब्बा") : t("boxes", "डिब्बे")}
            </span>
          </p>
          <p className="font-display text-lg font-bold text-maroon sm:text-xl">
            ₹{totalAmount.toLocaleString("en-IN")}
          </p>
        </div>

        <Button
          href={targetHref}
          onClick={handleViewOrder}
          size="sm"
          className="btn-sheen min-h-10 shrink-0 px-4 text-xs font-semibold sm:text-sm"
        >
          {t("View Order →", "ऑर्डर देखें →")}
        </Button>
      </div>
    </aside>
  );
}
