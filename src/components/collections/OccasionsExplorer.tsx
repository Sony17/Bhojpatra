"use client";

import CollectionGrid from "@/components/collections/CollectionGrid";
import { useLang } from "@/lib/i18n";
import { useHomeContent } from "@/lib/homeContent";
import { occasionHref } from "@/lib/homeLinks";

/** "View all" listing for the home Occasions rail — every occasion with imagery. */
export default function OccasionsExplorer() {
  const { lang, t } = useLang();
  const { occasions } = useHomeContent();

  const tiles = occasions.items.map((o) => ({
    id: o.id,
    name: lang === "hi" ? o.nameHi : o.name,
    image: o.image,
    href: occasionHref(o.id),
    cta: t("Book", "बुक"),
  }));

  return (
    <CollectionGrid
      eyebrow={t("Occasions", "अवसर")}
      title={t(
        "Every Celebration, One Bhojpatra Experience",
        "हर उत्सव, एक भोजपत्र अनुभव",
      )}
      subtitle={t(
        "Curated menus. Verified vendors. Seamless booking.",
        "क्यूरेटेड मेन्यू। वेरिफाइड वेंडर। आसान बुकिंग।",
      )}
      tiles={tiles}
    />
  );
}
