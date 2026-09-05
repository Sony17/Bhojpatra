"use client";

import { useState } from "react";
import Image from "next/image";
import SectionHead from "@/components/booking/shared/SectionHead";
import {
  addOns,
  addOnMenu,
  dummyDishPhoto,
  type AddOn,
  type AddOnCategory,
  type VendorListing,
} from "@/lib/data";
import { money } from "@/lib/money";
import { dishAllowed, type NonVegCount } from "@/lib/dietSplit";

type Lang = "en" | "hi";

/* ─── Extras & counters picker ────────────────────────────────────────────
 * The optional live counters, stations and whole-event services both booking
 * flows sell. Shared so the Single Stall plan's extras step is the same screen
 * as the tiered feast's — same cards, same vendor rosters, same price bands —
 * rather than a second, plainer list that happens to sell the same things.
 */
export default function StepExtras({
  lang,
  t,
  guests,
  selectedAddOns,
  toggleAddOn,
  packageName,
  multiVendor,
  eligibleVendors,
  vendorIdsFor,
  onVendorToggle,
  fullFilter,
  nonVegGuests = null,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  guests: number;
  selectedAddOns: string[];
  toggleAddOn: (id: string) => void;
  packageName: string;
  multiVendor: boolean;
  eligibleVendors: VendorListing[];
  vendorIdsFor: (addOnId: string) => string[];
  onVendorToggle: (addOnId: string, vendorId: string) => void;
  /** Gold/Platinum unlock the richer category filter; the lower tiers get just
   *  the free-text search. */
  fullFilter: boolean;
  /** Craft-my-plate split from the event brief. On a pure-veg plate a
   *  counter's non-veg lines are left off its shown spread (with a note) —
   *  the vendor cooks the veg spread only. The vendor roster itself is
   *  narrowed by the caller (`kitchenFitsSplit`), not here. */
  nonVegGuests?: NonVegCount;
}) {
  // Free-text filter over the add-on roster. Matches the English/Hindi names,
  // the description, and the hidden `keywords` aliases (so "gol gappe" finds the
  // Chaat Station). Selections live in the parent, so filtering never drops a
  // chosen add-on from the order — it only hides its card.
  const [addOnQuery, setAddOnQuery] = useState("");
  // Category filter — only the full-filter tiers (Gold/Platinum) can narrow the
  // roster to live counters vs whole-event services. We derive the effective
  // category from `fullFilter` (rather than resetting stored state in an effect)
  // so switching down to a search-only tier never leaves a stale category
  // silently hiding cards with no chip left to clear it.
  const [addOnCat, setAddOnCat] = useState<"all" | AddOnCategory>("all");
  const activeCat = fullFilter ? addOnCat : "all";
  // Which counters have their vendor roster open, keyed by add-on id. A counter
  // always carries a vendor (the parent defaults to the first eligible one), so
  // the roster stays folded behind a single "Change vendor" row and the chosen
  // brand + its set menu lead instead — exactly as the menu step docks a
  // vendor's dishes under it. Keeps the next counter within reach on a phone.
  const [openRosters, setOpenRosters] = useState<Record<string, boolean>>({});
  const toggleRoster = (addOnId: string) =>
    setOpenRosters((m) => ({ ...m, [addOnId]: !m[addOnId] }));
  // Picking on a single-vendor tier replaces the vendor, so the roster has done
  // its job — fold it back up. Multi-vendor tiers keep it open to add another.
  const chooseVendor = (addOnId: string, vendorId: string) => {
    onVendorToggle(addOnId, vendorId);
    if (!multiVendor) setOpenRosters((m) => ({ ...m, [addOnId]: false }));
  };
  const query = addOnQuery.trim().toLowerCase();
  const catOf = (a: AddOn): AddOnCategory => a.category ?? "counter";
  const visibleAddOns = addOns.filter((a) => {
    const matchesCat = activeCat === "all" || catOf(a) === activeCat;
    const matchesQuery =
      !query ||
      a.name.toLowerCase().includes(query) ||
      a.nameHi.includes(query) ||
      a.description.toLowerCase().includes(query) ||
      (a.keywords ?? []).some((k) => k.toLowerCase().includes(query));
    return matchesCat && matchesQuery;
  });
  // A counter's real cost depends on which vendor runs the station, so each card
  // shows a price *range* rather than one figure: the counter's base price
  // scaled across the eligible vendors' spread — cheapest → priciest, anchored
  // on the roster average (so the base price sits inside the band). The roster
  // narrows with the package tier, so the range tightens/shifts to match who's
  // actually available. A counter's price swings far less than a caterer's full
  // menu price (a ₹199-vs-₹1349 menu gap doesn't mean a 7× chaat-counter gap),
  // so we dampen the raw menu spread toward 1 — otherwise the extremes produce
  // implausible figures. With <2 eligible vendors there's no spread: flat price.
  const SPREAD_DAMP = 0.45;
  const vendorPlates = eligibleVendors
    .map((v) => v.priceFrom)
    .filter((n) => n > 0);
  const priceSpread =
    vendorPlates.length >= 2
      ? (() => {
          const avg =
            vendorPlates.reduce((s, n) => s + n, 0) / vendorPlates.length;
          const rawLo = Math.min(...vendorPlates) / avg;
          const rawHi = Math.max(...vendorPlates) / avg;
          return {
            lo: 1 - SPREAD_DAMP * (1 - rawLo),
            hi: 1 + SPREAD_DAMP * (rawHi - 1),
          };
        })()
      : null;
  const priceRange = (base: number): { min: number; max: number } =>
    priceSpread
      ? {
          min: Math.round(base * priceSpread.lo),
          max: Math.round(base * priceSpread.hi),
        }
      : { min: base, max: base };
  // The category chips shown on the full-filter tiers.
  const catChips: { id: "all" | AddOnCategory; label: string }[] = [
    { id: "all", label: t("All", "सभी") },
    { id: "counter", label: t("Live Counters", "लाइव काउंटर") },
    { id: "service", label: t("Services", "सर्विसेज़") },
  ];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead
          title={t("Add Extras & Counters", "एक्स्ट्रा और काउंटर जोड़ें")}
          sub={t(
            "Optional live counters and add-ons to round out your menu.",
            "अपने मेन्यू को पूरा करने के लिए वैकल्पिक लाइव काउंटर और ऐड-ऑन।",
          )}
        />
        {selectedAddOns.length > 0 && (
          <span className="shrink-0 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
            {t(
              `${selectedAddOns.length} added`,
              `${selectedAddOns.length} जोड़े गए`,
            )}
          </span>
        )}
      </div>

      <div className="relative mt-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-soft"
        >
          🔍
        </span>
        <input
          type="search"
          value={addOnQuery}
          onChange={(e) => setAddOnQuery(e.target.value)}
          placeholder={t(
            "Search add-ons like pizza or gol gappe",
            "पिज़्ज़ा या गोल गप्पे जैसे ऐड-ऑन खोजें",
          )}
          aria-label={t("Search add-ons", "ऐड-ऑन खोजें")}
          className="w-full rounded-lg border border-cream-3 bg-white py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-maroon"
        />
      </div>

      {/* Full-filter tiers (Gold/Platinum) can browse by category — live food /
          beverage counters vs whole-event services. The lower tiers (Single
          Stall / Silver) keep just the free-text search above. */}
      {fullFilter && (
        <div
          role="group"
          aria-label={t("Filter add-ons", "ऐड-ऑन फ़िल्टर करें")}
          className="mt-3 flex flex-nowrap gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible"
        >
          {catChips.map((c) => {
            const active = addOnCat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={active}
                onClick={() => setAddOnCat(c.id)}
                className={
                  "shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-semibold transition " +
                  (active
                    ? "border-maroon bg-maroon text-cream"
                    : "border-cream-3 bg-white text-ink hover:bg-cream-2")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {visibleAddOns.map((a: AddOn) => {
          const active = selectedAddOns.includes(a.id);
          // Per-unit range across eligible vendors, and the same range projected
          // over the headcount for the "≈ … for N guests" estimate.
          const { min: unitMin, max: unitMax } = priceRange(a.price);
          const hasRange = unitMin !== unitMax;
          const unitLabel = hasRange
            ? `${money(unitMin)}–${money(unitMax)}`
            : money(unitMin);
          const guestsLabel = hasRange
            ? `${money(unitMin * guests)}–${money(unitMax * guests)}`
            : money(unitMin * guests);
          const selectId = `addon-vendor-${a.id}`;
          // Vendors assigned to this counter — one on single-vendor tiers, or
          // several when the package allows splitting a counter across vendors.
          const pickedVendorIds = active ? vendorIdsFor(a.id) : [];
          // The chosen brand(s) lead, with this counter's set menu docked under
          // each; everyone else folds into the roster behind one row.
          const pickedVendors = eligibleVendors.filter((v) =>
            pickedVendorIds.includes(v.id),
          );
          const rosterVendors = eligibleVendors.filter(
            (v) => !pickedVendorIds.includes(v.id),
          );
          // Nothing picked (no eligible roster at all, or the guest reopened it)
          // → show the full list; otherwise it stays folded.
          const rosterOpen =
            pickedVendors.length === 0 || Boolean(openRosters[a.id]);
          // What the counter serves — the platform set menu, narrowed per
          // vendor to the items they declared in their dashboard (a vendor
          // that never trimmed it still serves the lot). Services list
          // inclusions instead of dishes.
          const setMenu = addOnMenu(a.id);
          const setMenuFor = (v: VendorListing) =>
            v.offeringItems?.[a.id]?.length
              ? v.offeringItems[a.id]
              : setMenu;
          const isService = catOf(a) === "service";
          return (
            <div
              key={a.id}
              className={
                "group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md " +
                (active ? "border-maroon ring-2 ring-maroon" : "border-cream-3")
              }
            >
              <button
                type="button"
                aria-pressed={active}
                onClick={() => toggleAddOn(a.id)}
                className="flex w-full items-stretch text-left"
              >
                {/* Counter photo — a left thumbnail at every width, the same
                    row shape the vendor and dish lists use. A full-bleed
                    banner cost ~250px of phone screen per counter and pushed
                    the next one out of sight; the price now reads in the copy
                    column instead of riding on the image. */}
                <div className="relative w-24 shrink-0 self-stretch overflow-hidden bg-cream-2 sm:w-40">
                  <Image
                    src={a.image}
                    alt={lang === "hi" ? a.nameHi : a.name}
                    fill
                    sizes="(min-width: 640px) 160px, 96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 items-start gap-2.5 p-3 sm:gap-3 sm:p-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-display text-sm font-semibold text-ink sm:text-base">
                      <span aria-hidden="true" className="mr-1.5">
                        {a.icon}
                      </span>
                      {lang === "hi" ? a.nameHi : a.name}
                    </h4>
                    <p className="mt-0.5 text-xs text-ink-soft sm:text-sm">
                      {a.description}
                    </p>
                    <p className="mt-1 text-xs font-bold text-maroon sm:text-sm">
                      {a.perPlate
                        ? `${unitLabel} / ${t("plate", "प्लेट")}`
                        : unitLabel}
                    </p>
                    <p className="text-[11px] text-ink-soft">
                      {a.perPlate
                        ? t(
                            `≈ ${guestsLabel} for ${guests} guests`,
                            `${guests} मेहमानों के लिए ≈ ${guestsLabel}`,
                          )
                        : t("One-time charge", "एकमुश्त शुल्क")}
                    </p>
                  </div>
                  <span
                    className={
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm transition " +
                      (active
                        ? "border-maroon bg-maroon text-cream"
                        : "border-cream-3 text-transparent")
                    }
                  >
                    ✓
                  </span>
                </div>
              </button>

              {/* Vendor for this counter — drawn from the catalogue for the
                  selected package's tier. Shown only once the add-on is on.
                  The chosen brand leads with this counter's set menu docked
                  underneath (the menu step's vendor → dishes pairing), and the
                  rest of the roster folds behind a single row — so the counter
                  below stays within reach instead of being pushed off-screen. */}
              {active && (
                <div className="border-t border-cream-3 px-4 pb-4 pt-3">
                  {eligibleVendors.length === 0 ? (
                    <>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        {t("Vendor for this counter", "इस काउंटर के लिए वेंडर")}
                      </span>
                      <p className="mt-1 text-sm text-ink-soft">
                        {t(
                          "No vendors available for this package.",
                          "इस पैकेज के लिए कोई वेंडर उपलब्ध नहीं।",
                        )}
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Your brand for this counter, with its set menu below. */}
                      <div className="flex flex-col gap-3">
                        {pickedVendors.map((v) => {
                          const fullMenu = setMenuFor(v);
                          // STRICT plate filter: a pure-veg event never sees a
                          // counter's non-veg lines — the vendor serves the
                          // veg spread only, and the note below says so.
                          const vendorMenu = fullMenu.filter((item) =>
                            dishAllowed(item.diet, nonVegGuests),
                          );
                          const trimmedCount =
                            fullMenu.length - vendorMenu.length;
                          return (
                          <div
                            key={v.id}
                            className="overflow-hidden rounded-2xl border border-maroon bg-white shadow-sm"
                          >
                            <div className="flex items-center gap-2.5 border-b border-cream-3 p-2.5 sm:gap-3 sm:p-3">
                              <span className="relative block h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-cream-3 bg-cream-2">
                                <Image
                                  src={v.image}
                                  alt={v.name}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                  <span className="min-w-0 truncate font-display text-sm font-semibold text-ink sm:text-base">
                                    {v.name}
                                  </span>
                                  <span className="shrink-0 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-semibold text-cream">
                                    {t("Selected", "चयनित")}
                                  </span>
                                </span>
                                <span className="mt-0.5 block text-xs text-ink-soft">
                                  {v.city} · ★ {v.rating} ·{" "}
                                  <span className="font-semibold text-ink">
                                    {t(
                                      `from ${money(v.priceFrom)} / plate`,
                                      `${money(v.priceFrom)} / प्लेट से`,
                                    )}
                                  </span>
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  multiVendor
                                    ? onVendorToggle(a.id, v.id)
                                    : toggleRoster(a.id)
                                }
                                className="shrink-0 rounded-full border border-maroon px-3 py-1.5 text-[11px] font-semibold text-maroon transition hover:bg-maroon hover:text-cream sm:text-xs"
                              >
                                {multiVendor
                                  ? t("Remove", "हटाएं")
                                  : t("Change", "बदलें")}
                              </button>
                            </div>
                            {/* This counter's set menu — fixed, so it reads as
                                what you get, not as another list to pick from. */}
                            {vendorMenu.length > 0 && (
                              <div className="bg-cream-2/30 p-2.5 sm:p-3">
                                <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                                  {isService
                                    ? t("What's included", "क्या शामिल है")
                                    : t(
                                        `${v.name} · set menu`,
                                        `${v.name} · फिक्स्ड मेन्यू`,
                                      )}
                                </span>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  {vendorMenu.map((item) => {
                                    // Veg → green, non-veg → brand maroon, the
                                    // same marks the menu step's dishes carry.
                                    const veg = item.diet === "veg";
                                    const dietBorder = veg
                                      ? "border-[#1a7f37]"
                                      : "border-maroon";
                                    const dietBg = veg
                                      ? "bg-[#1a7f37]"
                                      : "bg-maroon";
                                    return (
                                      <div
                                        key={item.name}
                                        className="flex items-center gap-2.5 rounded-xl border border-cream-3 bg-white p-1.5 shadow-sm"
                                      >
                                        {isService ? (
                                          <span
                                            aria-hidden="true"
                                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-2 text-sm text-maroon"
                                          >
                                            ✓
                                          </span>
                                        ) : (
                                          <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-cream-3 bg-cream-2">
                                            <Image
                                              src={dummyDishPhoto(
                                                `${a.id}-${item.name}`,
                                              )}
                                              alt=""
                                              fill
                                              sizes="36px"
                                              className="object-cover"
                                            />
                                          </span>
                                        )}
                                        {item.diet && (
                                          <span
                                            aria-hidden="true"
                                            className={
                                              "grid h-3.5 w-3.5 shrink-0 place-items-center rounded-sm border " +
                                              dietBorder
                                            }
                                          >
                                            <span
                                              className={
                                                "block h-1.5 w-1.5 rounded-full " +
                                                dietBg
                                              }
                                            />
                                          </span>
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink sm:text-sm">
                                          {lang === "hi"
                                            ? item.nameHi
                                            : item.name}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <p className="mt-2 text-[11px] text-ink-soft">
                                  {isService
                                    ? t(
                                        "All of it is covered by this add-on's price.",
                                        "यह सब इस ऐड-ऑन की क़ीमत में शामिल है।",
                                      )
                                    : t(
                                        "The whole counter is included — nothing to pick.",
                                        "पूरा काउंटर शामिल है — कुछ चुनने की ज़रूरत नहीं।",
                                      )}
                                </p>
                                {trimmedCount > 0 && (
                                  <p className="mt-1 text-[11px] font-semibold text-maroon">
                                    {t(
                                      `Pure veg plate — ${trimmedCount} non-veg ${trimmedCount === 1 ? "item" : "items"} left off this spread.`,
                                      `शुद्ध शाकाहारी थाली — इस काउंटर से ${trimmedCount} नॉन-वेज आइटम हटाए गए।`,
                                    )}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>

                      {/* Every other brand folds into this one row — a tap
                          reopens the roster to swap (or add, on Platinum). */}
                      {pickedVendors.length > 0 && rosterVendors.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleRoster(a.id)}
                          aria-expanded={rosterOpen}
                          className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-cream-3 bg-white px-3 py-2.5 text-left shadow-sm transition hover:border-maroon"
                        >
                          <span
                            aria-hidden="true"
                            className="flex shrink-0 -space-x-2"
                          >
                            {rosterVendors.slice(0, 3).map((v) => (
                              <span
                                key={v.id}
                                className="relative block h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-cream-2"
                              >
                                <Image
                                  src={v.image}
                                  alt=""
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              </span>
                            ))}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                            {multiVendor
                              ? t(
                                  `Add another vendor · ${rosterVendors.length} more`,
                                  `और वेंडर जोड़ें · ${rosterVendors.length} और`,
                                )
                              : t(
                                  `Change vendor · ${rosterVendors.length} more`,
                                  `वेंडर बदलें · ${rosterVendors.length} और`,
                                )}
                          </span>
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-base font-semibold leading-none text-maroon"
                          >
                            {rosterOpen ? "↑" : "↓"}
                          </span>
                        </button>
                      )}

                      {rosterOpen && (
                        <>
                          <span
                            id={selectId}
                            className="mt-3 block text-xs font-semibold uppercase tracking-wide text-ink-soft"
                          >
                            {multiVendor
                              ? t(
                                  "Vendors for this counter",
                                  "इस काउंटर के लिए वेंडर",
                                )
                              : t(
                                  "Vendor for this counter",
                                  "इस काउंटर के लिए वेंडर",
                                )}
                          </span>
                          {multiVendor && (
                            <p className="mt-1 text-xs text-ink-soft">
                              {t(
                                `Split this counter across multiple vendors — ${pickedVendorIds.length} selected.`,
                                `इस काउंटर को कई वेंडरों में बाँटें — ${pickedVendorIds.length} चुने गए।`,
                              )}
                            </p>
                          )}
                          <div
                            role="group"
                            aria-labelledby={selectId}
                            className="mt-2 grid gap-2 sm:grid-cols-2"
                          >
                            {rosterVendors.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => chooseVendor(a.id, v.id)}
                                className="flex items-center gap-3 rounded-xl border border-cream-3 bg-white p-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm"
                              >
                                <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-cream-2">
                                  <Image
                                    src={v.image}
                                    alt={v.name}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                  />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-display text-sm font-semibold text-ink">
                                    {v.name}
                                  </span>
                                  <span className="mt-0.5 block text-xs text-ink-soft">
                                    {v.city} · ★ {v.rating} ·{" "}
                                    <span className="font-semibold text-ink">
                                      {t(
                                        `from ${money(v.priceFrom)} / plate`,
                                        `${money(v.priceFrom)} / प्लेट से`,
                                      )}
                                    </span>
                                  </span>
                                </span>
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cream-3 text-[11px] text-transparent">
                                  ✓
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      <p className="mt-2 text-xs text-ink-soft">
                        {t(
                          `${packageName || "Selected package"} vendors`,
                          `${packageName || "चयनित पैकेज"} वेंडर`,
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {visibleAddOns.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-cream-3 bg-cream-2/40 px-4 py-6 text-center text-sm text-ink-soft">
          {query
            ? t(
                `No add-ons match "${addOnQuery.trim()}".`,
                `"${addOnQuery.trim()}" से मिलता कोई ऐड-ऑन नहीं।`,
              )
            : t(
                "No add-ons in this category.",
                "इस श्रेणी में कोई ऐड-ऑन नहीं।",
              )}
        </p>
      )}
    </div>
  );
}
