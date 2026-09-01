"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import SectionIntro from "@/components/SectionIntro";
import { useLang } from "@/lib/i18n";
import { useHomeContent, isUnoptimized } from "@/lib/homeContent";
import { occasionHref } from "@/lib/homeLinks";

/** "View all" listing for Occasions — with occasion-wise search & direct scroll discovery. */
export default function OccasionsExplorer() {
  const { lang, t } = useLang();
  const { occasions } = useHomeContent();
  const [searchQuery, setSearchQuery] = useState("");

  const allTiles = useMemo(
    () =>
      occasions.items.map((o) => ({
        id: o.id,
        name: lang === "hi" ? o.nameHi : o.name,
        nameEn: o.name,
        nameHi: o.nameHi,
        image: o.image,
        href: occasionHref(o.id),
        cta: t("Book", "बुक"),
      })),
    [occasions.items, lang, t],
  );

  const filteredTiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allTiles;
    return allTiles.filter(
      (tile) =>
        tile.name.toLowerCase().includes(q) ||
        tile.nameEn.toLowerCase().includes(q) ||
        tile.nameHi.toLowerCase().includes(q) ||
        tile.id.toLowerCase().includes(q),
    );
  }, [allTiles, searchQuery]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <SectionIntro
        eyebrow={t("Occasions", "अवसर")}
        title={t(
          "Every Celebration, One Bhojpatra Experience",
          "हर उत्सव, एक भोजपत्र अनुभव",
        )}
        subtitle={t(
          "Curated menus. Verified vendors. Seamless booking.",
          "क्यूरेटेड मेन्यू। वेरिफाइड वेंडर। आसान बुकिंग।",
        )}
      />

      {/* Occasion Search Bar */}
      <div className="mx-auto mt-6 max-w-lg sm:mt-8">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-maroon">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              "Search occasions (e.g. Wedding, Birthday, Haldi)...",
              "अवसर खोजें (जैसे शादी, बर्थडे, हल्दी)...",
            )}
            aria-label={t("Search occasions", "अवसर खोजें")}
            className="w-full rounded-full border border-maroon/20 bg-white py-2.5 pl-10 pr-10 text-sm font-medium text-ink shadow-soft outline-none placeholder:text-ink/40 transition focus:border-maroon focus:ring-2 focus:ring-maroon/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label={t("Clear search", "सर्च साफ़ करें")}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink/40 hover:text-maroon"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4 fill-current"
              >
                <path
                  fillRule="evenodd"
                  d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 01-1.414-1.414L8.586 10 3.636 5.05A1 1 0 115.05 3.636L10 8.586z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {searchQuery && (
          <p className="mt-2 text-center text-xs text-ink/60">
            {t(
              `Found ${filteredTiles.length} occasion${filteredTiles.length === 1 ? "" : "s"}`,
              `${filteredTiles.length} अवसर मिले`,
            )}
          </p>
        )}
      </div>

      {/* Occasion Tiles Grid */}
      {filteredTiles.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filteredTiles.map((tile) => (
            <Link
              key={tile.id}
              id={`occasion-${tile.id}`}
              href={tile.href}
              aria-label={tile.name}
              className="group relative scroll-mt-24 overflow-hidden border border-cream shadow-pop transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] sm:scroll-mt-28"
            >
              <span className="relative block aspect-[3/4] w-full bg-cream">
                <Image
                  src={tile.image}
                  alt={tile.name}
                  fill
                  sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                  unoptimized={isUnoptimized(tile.image)}
                />
                <span aria-hidden className="absolute inset-0 bg-black/45" />
                <span className="media-veil absolute inset-0" />
                <span className="absolute inset-x-0 bottom-0 px-3 pb-3.5">
                  <span className="block font-sans text-[14px] font-bold leading-tight text-cream sm:text-[15px]">
                    {tile.name}
                  </span>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm">
                    {tile.cta}
                    <span aria-hidden>→</span>
                  </span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-12 max-w-sm rounded-card border border-maroon/10 bg-cream/30 p-6 text-center">
          <p className="font-sans text-sm font-semibold text-ink">
            {t("No occasions match your search", "कोई अवसर नहीं मिला")}
          </p>
          <p className="mt-1 text-xs text-ink/60">
            {t(
              "Try searching for another celebration like Wedding or Birthday.",
              "कृपया शादी या बर्थडे जैसा कोई अन्य अवसर खोजें।",
            )}
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-4 inline-flex items-center gap-1 rounded-full bg-maroon px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-maroon-dark"
          >
            {t("Show all occasions", "सभी अवसर दिखाएं")}
          </button>
        </div>
      )}
    </section>
  );
}
