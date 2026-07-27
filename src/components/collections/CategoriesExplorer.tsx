"use client";

import CollectionGrid, {
  type CollectionTile,
} from "@/components/collections/CollectionGrid";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import { serviceCategoryHref } from "@/lib/homeLinks";

/** "View all" listing for the home Categories rail — every category with imagery. */
export default function CategoriesExplorer() {
  const { lang, t } = useLang();
  const { services } = useHomeContent();

  const showPrices = services.showPrices;
  const priceSub = (priceFrom?: string): string | undefined =>
    showPrices && priceFrom
      ? lang === "hi"
        ? `${priceFrom} से`
        : `From ${priceFrom}`
      : undefined;

  const tiles: CollectionTile[] = services.categories.map((c) => ({
    id: c.id,
    name: lang === "hi" ? c.nameHi : c.name,
    image: c.image,
    href: serviceCategoryHref(c.id, c.name),
    cta: t("Explore", "देखें"),
    sub: priceSub(c.priceFrom),
  }));

  const baina = services.bainaBox;
  tiles.push({
    id: baina.id,
    name: lang === "hi" ? baina.nameHi : baina.name,
    image: baina.image,
    href: "/vendors?q=Baina+Box",
    cta: t("Explore", "देखें"),
    sub: priceSub(baina.priceFrom),
  });

  return (
    <CollectionGrid
      eyebrow={t("Categories", "कैटेगरी")}
      title={t(
        "Every Craving, One Bhojpatra Experience",
        "हर स्वाद, एक भोजपत्र अनुभव",
      )}
      subtitle={t(
        "Curated menus. Verified vendors. Seamless booking.",
        "क्यूरेटेड मेन्यू। वेरिफाइड वेंडर। आसान बुकिंग।",
      )}
      tiles={tiles}
    />
  );
}
