"use client";

import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";

/** Curated, verified Unsplash assets (host allow-listed in next.config.ts). */
const img = (id: string, w = 500) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

/** Famous mithai houses whose baina boxes we pack & deliver. */
const brands: {
  id: string;
  name: string;
  nameHi: string;
  /** Circular monogram shown beside the brand name. */
  monogram: string;
  image: string;
}[] = [
  {
    id: "ram-asrey",
    name: "Ram Asrey",
    nameHi: "राम आसरे",
    monogram: "RA",
    image: img("photo-1631452180519-c014fe946bc7"),
  },
  {
    id: "chhappan-bhog",
    name: "Chhappan Bhog",
    nameHi: "छप्पन भोग",
    monogram: "CB",
    image: img("photo-1606491956689-2ea866880c84"),
  },
  {
    id: "hazelnut-factory",
    name: "Hazelnut Factory",
    nameHi: "हेज़लनट फैक्ट्री",
    monogram: "HF",
    image: img("photo-1549465220-1a8b9238cd48"),
  },
  {
    id: "premium-packaging",
    name: "Premium Packaging",
    nameHi: "प्रीमियम पैकेजिंग",
    monogram: "PP",
    image: img("photo-1513201099705-a9746e1e201f"),
  },
];

/**
 * "Celebrate with Sweetness & Love" — a cream promo band under Services
 * showcasing premium baina boxes from famous brands.
 */
export default function BainaBoxes() {
  const { lang, t } = useLang();

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <Reveal variant="scale">
          <div className="grid items-center gap-10 rounded-3xl bg-cream/40 p-8 ring-1 ring-cream sm:p-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            {/* Left — heading, lede, CTA */}
            <div className="text-center lg:text-left">
              <h2 className="font-display text-3xl leading-tight text-ink sm:text-4xl">
                <span className="block">{t("Celebrate with", "उत्सव मनाएं")}</span>
                <span className="mt-1 block text-maroon">
                  {t("Sweetness & Love", "मिठास और प्यार के साथ")}
                </span>
              </h2>
              <p className="font-script mx-auto mt-4 max-w-sm text-lg text-ink-soft lg:mx-0">
                {t(
                  "Premium Baina Boxes from famous brands, beautifully packed.",
                  "मशहूर ब्रांड्स के प्रीमियम बैना बॉक्स, खूबसूरती से पैक किए हुए।",
                )}
              </p>
              <Link
                href="/vendors?q=Baina+Box"
                className="btn-sheen mt-8 inline-flex items-center justify-center rounded-full border border-maroon px-8 py-3 text-sm font-semibold text-maroon transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon hover:text-cream hover:shadow-lg active:scale-95"
              >
                {t("Explore Baina Box →", "बैना बॉक्स देखें →")}
              </Link>
            </div>

            {/* Right — brand boxes */}
            <Reveal
              as="ul"
              stagger
              className="grid grid-cols-2 gap-5 sm:grid-cols-4"
            >
              {brands.map((brand) => (
                <li key={brand.id} className="flex flex-col items-center gap-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl ring-1 ring-cream shadow-sm transition duration-300 hover:shadow-md">
                    <Image
                      src={brand.image}
                      alt={lang === "hi" ? brand.nameHi : brand.name}
                      fill
                      sizes="(min-width: 1024px) 150px, (min-width: 640px) 25vw, 50vw"
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                  <div className="flex min-h-10 w-full items-center justify-center gap-2 text-center">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-maroon ring-1 ring-maroon/40">
                      {brand.monogram}
                    </span>
                    <span className="text-sm font-semibold leading-snug text-ink">
                      {lang === "hi" ? brand.nameHi : brand.name}
                    </span>
                  </div>
                </li>
              ))}
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
