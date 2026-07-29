"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { AppBar, Button, Card, CategoryChip, CategoryChips } from "@/components/ui";
import { StarIcon } from "@/components/reviews/reviewDisplay";
import type { PublicVendorProfile, VendorBainaBox, VendorEssentialService } from "@/lib/vendorMenus";
import type { VendorListing } from "@/lib/data";
import { getBainaBoxVendorByVendorId } from "@/lib/bainaBoxData";

export interface FullMenuItem {
  name: string;
  nameHi?: string;
  diet?: string;
  photo?: string;
  icon?: string;
}

export interface FullMenuCategory {
  id: string;
  name: string;
  nameHi?: string;
  icon?: string;
  perPlate?: number;
  items: FullMenuItem[];
}

/** Signature dishes for static vendors keyed by cuisine */
const FAMOUS_FOR: Record<
  string,
  { name: string; nameHi: string; icon: string }[]
> = {
  Chaat: [
    { name: "Gol Gappe", nameHi: "गोल गप्पे", icon: "🥟" },
    { name: "Aloo Tikki Chaat", nameHi: "आलू टिक्की चाट", icon: "🥔" },
    { name: "Dahi Bhalla", nameHi: "दही भल्ला", icon: "🥣" },
    { name: "Papdi Chaat", nameHi: "पापड़ी चाट", icon: "🫓" },
  ],
  Mughlai: [
    { name: "Galouti Kebab", nameHi: "गलौटी कबाब", icon: "🍢" },
    { name: "Dum Biryani", nameHi: "दम बिरयानी", icon: "🍛" },
    { name: "Mutton Korma", nameHi: "मटन कोरमा", icon: "🍲" },
    { name: "Sheermal", nameHi: "शीरमाल", icon: "🫓" },
  ],
  "North Indian": [
    { name: "Dal Makhani", nameHi: "दाल मखनी", icon: "🍲" },
    { name: "Paneer Lababdar", nameHi: "पनीर लबाबदार", icon: "🧀" },
    { name: "Tandoori Platter", nameHi: "तंदूरी प्लैटर", icon: "🍢" },
    { name: "Gulab Jamun", nameHi: "गुलाब जामुन", icon: "🍮" },
  ],
  Punjabi: [
    { name: "Chole Bhature", nameHi: "छोले भटूरे", icon: "🫓" },
    { name: "Butter Chicken", nameHi: "बटर चिकन", icon: "🍗" },
    { name: "Amritsari Kulcha", nameHi: "अमृतसरी कुलचा", icon: "🥙" },
    { name: "Lassi", nameHi: "लस्सी", icon: "🥛" },
  ],
  "South Indian": [
    { name: "Masala Dosa", nameHi: "मसाला डोसा", icon: "🥞" },
    { name: "Idli Sambar", nameHi: "इडली सांभर", icon: "🍚" },
    { name: "Chettinad Curry", nameHi: "चेट्टीनाड करी", icon: "🍛" },
    { name: "Filter Coffee", nameHi: "फ़िल्टर कॉफ़ी", icon: "☕" },
  ],
  Bengali: [
    { name: "Kosha Mangsho", nameHi: "कोशा मांग्शो", icon: "🍲" },
    { name: "Fish Curry", nameHi: "मछली करी", icon: "🐟" },
    { name: "Rosogolla", nameHi: "रसगुल्ला", icon: "🍡" },
    { name: "Mishti Doi", nameHi: "मिष्टी दोई", icon: "🥣" },
  ],
  Chinese: [
    { name: "Hakka Noodles", nameHi: "हक्का नूडल्स", icon: "🍜" },
    { name: "Veg Manchurian", nameHi: "वेज मंचूरियन", icon: "🥡" },
    { name: "Spring Rolls", nameHi: "स्प्रिंग रोल", icon: "🌯" },
    { name: "Chilli Paneer", nameHi: "चिली पनीर", icon: "🌶️" },
  ],
  Continental: [
    { name: "Wood-fired Pizza", nameHi: "वुड-फ़ायर्ड पिज़्ज़ा", icon: "🍕" },
    { name: "Pasta Station", nameHi: "पास्ता स्टेशन", icon: "🍝" },
    { name: "Grilled Sizzlers", nameHi: "ग्रिल्ड सिज़लर", icon: "🥘" },
    { name: "Salad Bar", nameHi: "सलाद बार", icon: "🥗" },
  ],
  "Baina Boxes": [
    { name: "Motichoor Ladoo", nameHi: "मोतीचूर लड्डू", icon: "🍮" },
    { name: "Kaju Katli", nameHi: "काजू कतली", icon: "🍬" },
    { name: "Dry Fruit Box", nameHi: "ड्राई फ्रूट बॉक्स", icon: "🥜" },
    { name: "Gujiya", nameHi: "गुझिया", icon: "🥟" },
  ],
  Beverages: [
    { name: "Masala Shikanji", nameHi: "मसाला शिकंजी", icon: "🍋" },
    { name: "Thandai", nameHi: "ठंडाई", icon: "🥛" },
    { name: "Mocktail Counter", nameHi: "मॉकटेल काउंटर", icon: "🍹" },
    { name: "Fresh Juices", nameHi: "ताज़ा जूस", icon: "🧃" },
  ],
  Decor: [
    { name: "Mandap Styling", nameHi: "मंडप सज्जा", icon: "🏵️" },
    { name: "Floral Themes", nameHi: "पुष्प थीम", icon: "💐" },
    { name: "Stage Backdrops", nameHi: "स्टेज बैकड्रॉप", icon: "✨" },
    { name: "Festive Lighting", nameHi: "उत्सव रोशनी", icon: "🪔" },
  ],
};

export default function VendorFullMenu({
  vendorId,
  profile,
  listing,
}: {
  vendorId: string;
  profile: PublicVendorProfile | null;
  listing: VendorListing | null;
}) {
  const { t, lang } = useLang();
  const [selectedCat, setSelectedCat] = useState<string>("all");

  const vendorName = profile?.business ?? listing?.name ?? "";
  const city = profile?.city ?? listing?.city ?? "";
  const state = profile?.state ?? listing?.state ?? "";
  const priceFrom = profile?.priceFrom ?? listing?.priceFrom ?? 0;
  const rating = profile?.rating ?? listing?.rating ?? 4.8;
  const reviews = profile?.reviews ?? listing?.reviews ?? 100;
  const verified = profile?.verified ?? listing?.verified ?? false;
  const cuisines = profile?.cuisines ?? listing?.cuisines ?? [];
  const bookHref = `/book?vendor=${vendorId}`;

  // Assemble full menu categories
  const categories: FullMenuCategory[] = [];

  if (profile) {
    for (const m of profile.menu) {
      categories.push({
        id: m.categoryId,
        name: m.name,
        nameHi: m.nameHi,
        icon: m.icon,
        perPlate: m.perPlate,
        items: m.items.map((it) => ({
          name: it.name,
          diet: it.diet,
          photo: it.photo,
        })),
      });
    }
  } else if (listing) {
    // Check Baina Box data
    const bainaVendor = getBainaBoxVendorByVendorId(listing.id);
    if (bainaVendor && bainaVendor.products.length > 0) {
      categories.push({
        id: "gift-boxes",
        name: "Gift Boxes",
        nameHi: "गिफ़्ट बॉक्स",
        icon: "🎁",
        items: bainaVendor.products.map((p) => ({
          name: p.name,
          photo: p.image,
          icon: "🎁",
        })),
      });
    }

    // Check cuisines
    for (const c of listing.cuisines) {
      const famous = FAMOUS_FOR[c];
      if (famous && famous.length > 0) {
        categories.push({
          id: c.toLowerCase().replace(/\s+/g, "-"),
          name: c,
          nameHi: c,
          items: famous.map((f) => ({
            name: f.name,
            nameHi: f.nameHi,
            icon: f.icon,
            diet: listing.diet === "Veg" ? "veg" : "non-veg",
          })),
        });
      }
    }
  }

  const bainaBoxes = profile?.bainaBoxes ?? [];
  const counters = profile?.counters ?? [];

  const visibleCategories =
    selectedCat === "all"
      ? categories
      : categories.filter((c) => c.id === selectedCat);

  return (
    <div className="min-h-screen bg-cream/20 pb-24">
      {/* ── App Bar ─────────────────────────────────────────────── */}
      <AppBar
        title={vendorName}
        subtitle={t("Full Menu", "पूरा मेन्यू")}
        backHref={`/vendors/${vendorId}`}
      />

      <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
        {/* ── Vendor Summary Card ───────────────────────────────── */}
        <Card padding="none" className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">
                  {vendorName}
                </h1>
                {verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-cream-2 px-2 py-0.5 text-[10px] font-bold text-maroon">
                    ✓ {t("Verified", "वेरिफाइड")}
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                {city}{state ? `, ${state}` : ""}
              </p>
              {cuisines.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {cuisines.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-cream-2 px-2.5 py-0.5 text-[11px] font-medium text-ink"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price & Rating */}
            <div className="shrink-0 text-right">
              <p className="font-display text-lg font-bold text-maroon sm:text-2xl">
                ₹{priceFrom.toLocaleString("en-IN")}
                <span className="text-xs font-normal text-ink-soft">
                  {" "}/ {t("plate", "प्लेट")}
                </span>
              </p>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-maroon px-2 py-0.5 text-xs font-bold text-white">
                <StarIcon className="h-3 w-3 text-cream" />
                {rating} ({reviews})
              </div>
            </div>
          </div>
        </Card>

        {/* ── Category Navigation Chips ───────────────────────────── */}
        {categories.length > 1 && (
          <div className="mt-5">
            <CategoryChips label={t("Menu categories", "मेन्यू श्रेणियाँ")}>
              <CategoryChip
                selected={selectedCat === "all"}
                onClick={() => setSelectedCat("all")}
              >
                {t("All Categories", "सभी श्रेणियाँ")}
              </CategoryChip>
              {categories.map((cat) => (
                <CategoryChip
                  key={cat.id}
                  selected={selectedCat === cat.id}
                  onClick={() => setSelectedCat(cat.id)}
                  leftIcon={cat.icon ? <span>{cat.icon}</span> : undefined}
                >
                  {lang === "hi" ? cat.nameHi ?? cat.name : cat.name}
                </CategoryChip>
              ))}
            </CategoryChips>
          </div>
        )}

        {/* ── Menu Categories & Dish Items ───────────────────────── */}
        <div className="mt-6 space-y-6">
          {visibleCategories.map((cat) => (
            <Card key={cat.id} padding="none" className="p-4 sm:p-6">
              <div className="flex items-center justify-between border-b border-cream-3 pb-3">
                <div className="flex items-center gap-2.5">
                  {cat.icon && (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-lg">
                      {cat.icon}
                    </span>
                  )}
                  <div>
                    <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                      {lang === "hi" ? cat.nameHi ?? cat.name : cat.name}
                    </h2>
                    <p className="text-xs text-ink-soft">
                      {cat.items.length}{" "}
                      {t("items available", "डिश उपलब्ध")}
                    </p>
                  </div>
                </div>
                {cat.perPlate !== undefined && cat.perPlate > 0 && (
                  <span className="rounded-full bg-cream-2 px-3 py-1 text-xs font-semibold text-maroon">
                    +₹{cat.perPlate}/{t("plate", "प्लेट")}
                  </span>
                )}
              </div>

              {/* Items Grid */}
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {cat.items.map((item, idx) => {
                  const isVeg = item.diet === "veg" || item.diet === "Veg";
                  const isNonVeg = item.diet === "non-veg" || item.diet === "Non-Veg";

                  return (
                    <div
                      key={`${item.name}-${idx}`}
                      className="flex items-center gap-3 rounded-xl border border-cream-3 bg-white p-3 shadow-xs transition hover:border-maroon/20"
                    >
                      {/* Photo or Icon */}
                      {item.photo ? (
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-cream-3">
                          <Image
                            src={item.photo}
                            alt={item.name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      ) : item.icon ? (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cream text-xl">
                          {item.icon}
                        </span>
                      ) : null}

                      {/* Item Name & Diet indicator */}
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
                          <p className="truncate text-sm font-semibold text-ink sm:text-base">
                            {lang === "hi" && item.nameHi ? item.nameHi : item.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}

          {/* ── Baina Boxes (if vendor offers box packages) ─────── */}
          {bainaBoxes.length > 0 && (
            <Card padding="none" className="p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                🎁 {t("Baina Boxes / Gift Boxes", "बैना बॉक्स / गिफ़्ट बॉक्स")}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {bainaBoxes.map((box, i) => (
                  <div
                    key={`${box.name}-${i}`}
                    className="rounded-xl border border-cream-3 bg-white p-3.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-ink">{box.name}</p>
                        {box.contents && (
                          <p className="mt-1 text-xs text-ink-soft">{box.contents}</p>
                        )}
                      </div>
                      <span className="shrink-0 font-display text-sm font-bold text-maroon">
                        ₹{box.price.toLocaleString("en-IN")} / ½ kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Live Counters & Services (if offered) ─────────────── */}
          {counters.length > 0 && (
            <Card padding="none" className="p-4 sm:p-6">
              <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
                🔥 {t("Live Counters & Services", "लाइव काउंटर और सेवाएं")}
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {counters.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-cream-3 bg-white p-3 shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{c.icon}</span>
                      <span className="text-sm font-semibold text-ink">
                        {lang === "hi" ? c.nameHi : c.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-maroon">
                      ₹{c.price.toLocaleString("en-IN")}
                      {c.perPlate ? ` / ${t("plate", "प्लेट")}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── Sticky Bottom Action Bar ────────────────────────────── */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-maroon/10 bg-white/95 p-3.5 shadow-pop-up backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-ink-soft">{t("Base Price", "बेस प्राइस")}</p>
              <p className="font-display text-lg font-bold text-maroon">
                ₹{priceFrom.toLocaleString("en-IN")}
                <span className="text-xs font-normal text-ink-soft"> / {t("plate", "प्लेट")}</span>
              </p>
            </div>

            <Button href={bookHref} variant="primary" size="lg" className="px-6">
              {t("Book Now", "अभी बुक करें")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
