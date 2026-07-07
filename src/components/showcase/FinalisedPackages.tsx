"use client";

/**
 * Finalised package section — all nine differentiation ideas folded into one
 * cohesive layout, styled in the live Bhojpatra theme (maroon display headings,
 * cream/maroon surfaces with alpha, Reveal motion, ornaments, btn-sheen).
 *
 * Ideas combined per tier card: role badge (9) · guest-fit + occasion chips (7)
 * · "how full a feast" meter (4) · stat strip (1) · only-here banner (5) ·
 * "everything in X, plus" unlocks (2) · real dish thumbnails (6). Below the
 * cards: the price-jump upgrade path (8) and a single scannable comparison
 * grid (3). Real tier data (names, prices, pax, counts) comes from src/lib/data.
 * Palette is brand-only: red #B92025, cream #F0D09E, black, white.
 */

import { useState } from "react";
import Link from "next/link";
import { packages, packageCategoryItems, type PackageTier } from "@/lib/data";
import Reveal from "@/components/Reveal";
import { useLang } from "@/lib/i18n";

type TierId = "silver" | "gold" | "platinum";
type Bi = [en: string, hi: string];

/* ── Curated per-tier extras that aren't in the seed data ────────────────── */

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&q=60`;

const SPREAD = {
  silver: "photo-1490645935967-10de6ba17061",
  gold: "photo-1543339308-43e59d6b73a6",
  platinum: "photo-1600891964599-f61ba0e24092",
  custom: "photo-1467003909585-2f8a72700288",
};

const META: Record<
  TierId,
  {
    badge: Bi;
    onlyHere: Bi;
    fill: number; // 0–100, "how full a feast"
    adds: Bi[]; // what this tier unlocks over the one below
    vendors: Bi;
    dishes: { name: string; img: string }[];
  }
> = {
  silver: {
    badge: ["Best value", "बेस्ट वैल्यू"],
    onlyHere: ["A fixed, fuss-free menu — nothing to plan", "एक तय, आसान मेन्यू — कुछ प्लान नहीं करना"],
    fill: 40,
    adds: [],
    vendors: ["Single vendor", "एक वेंडर"],
    dishes: [
      { name: "Veg thali", img: SPREAD.silver },
      { name: "Dal & rice", img: SPREAD.custom },
      { name: "Gulab jamun", img: SPREAD.gold },
    ],
  },
  gold: {
    badge: ["Most chosen", "सबसे लोकप्रिय"],
    onlyHere: ["Live stalls, chaat & multi-cuisine counters unlocked", "लाइव स्टॉल, चाट और मल्टी-कुज़ीन काउंटर"],
    fill: 74,
    adds: [
      ["+3 starters (5 total)", "+3 स्टार्टर (कुल 5)"],
      ["Live stalls", "लाइव स्टॉल"],
      ["Chaat counters", "चाट काउंटर"],
      ["Chinese & South-Indian", "चाइनीज़ और साउथ इंडियन"],
    ],
    vendors: ["Multiple vendors", "कई वेंडर"],
    dishes: [
      { name: "Live chaat", img: SPREAD.gold },
      { name: "Tandoori grill", img: SPREAD.platinum },
      { name: "Hakka noodles", img: SPREAD.custom },
      { name: "Rasmalai", img: SPREAD.silver },
    ],
  },
  platinum: {
    badge: ["Premium", "प्रीमियम"],
    onlyHere: ["Famous vendors + the grandest spread, at any guest count", "मशहूर वेंडर और सबसे भव्य दावत, किसी भी संख्या में"],
    fill: 100,
    adds: [
      ["A 6th starter", "छठा स्टार्टर"],
      ["A 2nd live stall", "दूसरा लाइव स्टॉल"],
      ["More chaat & sweets", "ज़्यादा चाट और मिठाई"],
      ["Famous premium vendors", "मशहूर प्रीमियम वेंडर"],
    ],
    vendors: ["Famous vendors", "मशहूर वेंडर"],
    dishes: [
      { name: "Galouti kebab", img: SPREAD.platinum },
      { name: "Dum biryani", img: SPREAD.gold },
      { name: "Shahi tukda", img: SPREAD.silver },
      { name: "Kulfi falooda", img: SPREAD.custom },
    ],
  },
};

/** Item counts per category, straight from the seed config. */
function spec(id: string) {
  const c = packageCategoryItems[id] ?? {};
  return {
    welcome: c.welcome ?? 0,
    starters: c.starters ?? 0,
    live: c.live ?? 0,
    chaat: c.chaat ?? 0,
    main: c.main ?? 0,
    sweets: c.sweets ?? 0,
  };
}

/* ── Brand surface helpers (white → cream → red as the tier climbs) ─────── */

function surface(id: TierId) {
  if (id === "platinum") return "bg-maroon border border-maroon text-cream";
  if (id === "gold") return "bg-cream/60 border border-maroon/30 ring-1 ring-maroon/15";
  return "bg-white border border-maroon/15";
}
function badgeChip(id: TierId) {
  if (id === "platinum") return "bg-cream text-maroon";
  if (id === "gold") return "bg-maroon text-cream";
  return "bg-cream text-maroon ring-1 ring-maroon/25";
}
const isDark = (id: TierId) => id === "platinum";
const muted = (id: TierId) => (isDark(id) ? "text-cream/75" : "text-ink-soft");

/* ── Small brand pieces ─────────────────────────────────────────────────── */

function Ornament({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`flex w-28 items-center justify-center gap-2 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-70" />
    </span>
  );
}

function Meter({ value, dark }: { value: number; dark: boolean }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${dark ? "bg-cream/25" : "bg-maroon/10"}`}>
      <div className={`h-full rounded-full ${dark ? "bg-cream" : "bg-maroon"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

/* ── One enhanced tier card (ideas 1, 2, 4, 5, 6, 7, 9) ─────────────────── */

function TierCard({ tier, cta }: { tier: PackageTier; cta: React.ReactNode }) {
  const { lang, t } = useLang();
  const id = tier.id as TierId;
  const m = META[id];
  const s = spec(id);
  const dark = isDark(id);
  const bi = (v: Bi) => (lang === "hi" ? v[1] : v[0]);

  const name = lang === "hi" ? tier.nameHi : tier.name;
  const pax = lang === "hi" ? tier.paxHi : tier.pax;
  const bestFor = lang === "hi" ? tier.bestForHi : tier.bestFor;
  const unit = lang === "hi" ? tier.unitHi : tier.unit;
  const occasions = (bestFor ?? "").split("·").map((x) => x.trim()).filter(Boolean);

  const stats = [
    { n: s.starters, l: t("Starters", "स्टार्टर") },
    { n: s.live, l: t("Live stalls", "लाइव स्टॉल") },
    { n: s.sweets, l: t("Sweets", "मिठाई") },
  ];

  return (
    <div className={`card-lift relative flex h-full flex-col rounded-3xl p-6 ${surface(id)}`}>
      {/* Ribbon — Popular (Gold) / Premium (Platinum) */}
      {tier.popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-cream px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-maroon shadow-sm ring-1 ring-maroon/40">
          {t("Popular Choice", "लोकप्रिय विकल्प")}
        </span>
      )}
      {id === "platinum" && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink px-3 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-cream shadow-sm">
          ★ {t("Premium", "प्रीमियम")}
        </span>
      )}

      {/* Role badge + name + price */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeChip(id)}`}>
          {bi(m.badge)}
        </span>
      </div>
      <h3 className={`mt-3 font-display text-3xl leading-none ${dark ? "text-cream" : "text-maroon"}`}>{name}</h3>
      <p className={`mt-2 ${muted(id)}`}>
        <span className={`text-2xl font-bold ${dark ? "text-cream" : "text-maroon"}`}>{tier.price}</span>{" "}
        <span className="text-sm">{unit}</span>
      </p>

      {/* Guest-fit + occasion chips (idea 7) */}
      {pax && (
        <div
          className={`mt-3 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            dark ? "bg-cream/15 text-cream" : "bg-maroon/8 text-maroon"
          }`}
        >
          {pax}
        </div>
      )}
      {occasions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {occasions.map((o) => (
            <span
              key={o}
              className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                dark ? "bg-cream/12 text-cream/90" : "bg-ink/5 text-ink-soft"
              }`}
            >
              {o}
            </span>
          ))}
        </div>
      )}

      {/* Fullness meter (idea 4) */}
      <div className="mt-5">
        <div className={`mb-1.5 flex items-center justify-between text-[11px] ${muted(id)}`}>
          <span>{t("How full a feast", "कितनी भरी दावत")}</span>
          <span className="font-semibold">{m.fill}%</span>
        </div>
        <Meter value={m.fill} dark={dark} />
      </div>

      {/* Stat strip (idea 1) */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {stats.map((st) => (
          <div
            key={st.l}
            className={`rounded-xl px-2 py-2.5 text-center ${dark ? "bg-cream/12" : "bg-maroon/5"}`}
          >
            <div className={`text-2xl font-bold leading-none ${dark ? "text-cream" : "text-maroon"}`}>
              {st.n || "—"}
            </div>
            <div className={`mt-1 text-[10px] ${muted(id)}`}>{st.l}</div>
          </div>
        ))}
      </div>

      {/* Only-here banner (idea 5) */}
      <div
        className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
          dark ? "border border-cream/25 bg-cream/15 text-cream" : "border border-maroon/15 bg-cream/60 text-maroon"
        }`}
      >
        <span className="mr-1 font-bold">{t("Only here:", "सिर्फ़ यहाँ:")}</span>
        {bi(m.onlyHere)}
      </div>

      {/* Cumulative unlocks (idea 2) */}
      {m.adds.length > 0 ? (
        <div className="mt-4">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${muted(id)}`}>
            {t("Everything below, plus", "नीचे वाला सब, और")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {m.adds.map((a) => (
              <li key={a[0]} className={`flex items-start gap-2 text-sm ${dark ? "text-cream" : "text-ink"}`}>
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                    dark ? "bg-cream text-maroon" : "bg-maroon text-cream"
                  }`}
                >
                  +
                </span>
                {bi(a)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={`mt-4 text-sm ${muted(id)}`}>
          {t("The complete fixed menu — nothing to decide.", "पूरा तय मेन्यू — कुछ तय नहीं करना।")}
        </p>
      )}

      {/* Real dish thumbnails (idea 6) */}
      <div className="mt-5 flex flex-wrap gap-2">
        {m.dishes.map((d) => (
          <div key={d.name} className="flex w-14 flex-col items-center gap-1 text-center">
            <span
              className="h-11 w-11 rounded-full bg-cream bg-cover bg-center ring-1 ring-maroon/15"
              style={{ backgroundImage: `url(${unsplash(d.img)})` }}
            />
            <span className={`text-[9px] leading-tight ${muted(id)}`}>{d.name}</span>
          </div>
        ))}
      </div>

      {/* CTA pinned to the bottom */}
      <div className="mt-auto pt-6">{cta}</div>
    </div>
  );
}

/* ── Upgrade path (idea 8) ──────────────────────────────────────────────── */

function UpgradePath() {
  const { t } = useLang();
  const steps = [
    { name: t("Silver", "सिल्वर"), price: "₹799" },
    { jump: "+₹400", note: t("live counters, chaat & 5 starters", "लाइव काउंटर, चाट और 5 स्टार्टर") },
    { name: t("Gold", "गोल्ड"), price: "₹1199" },
    { jump: "+₹400", note: t("famous vendors & the fullest spread", "मशहूर वेंडर और सबसे भरी दावत") },
    { name: t("Platinum", "प्लैटिनम"), price: "₹1599+" },
  ];
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
      {steps.map((step, i) =>
        "name" in step ? (
          <div
            key={i}
            className="rounded-2xl border border-maroon/20 bg-white px-5 py-3 text-center shadow-sm"
          >
            <div className="font-display text-lg text-maroon">{step.name}</div>
            <div className="text-sm font-semibold text-ink-soft">{step.price}</div>
          </div>
        ) : (
          <div key={i} className="flex flex-col items-center px-1 text-center">
            <span className="rounded-full bg-maroon px-3 py-1 text-xs font-bold text-cream">{step.jump}</span>
            <span className="mt-1 max-w-[10rem] text-[11px] text-ink-soft">→ {step.note}</span>
          </div>
        ),
      )}
    </div>
  );
}

/* ── Comparison grid (idea 3) ───────────────────────────────────────────── */

type Row = { key: keyof ReturnType<typeof spec> | "vendors"; label: Bi };
const ROWS: Row[] = [
  { key: "welcome", label: ["Welcome drinks", "वेलकम ड्रिंक"] },
  { key: "starters", label: ["Starters", "स्टार्टर"] },
  { key: "live", label: ["Live stalls", "लाइव स्टॉल"] },
  { key: "chaat", label: ["Chaat counters", "चाट काउंटर"] },
  { key: "main", label: ["Main-course dishes", "मेन कोर्स"] },
  { key: "sweets", label: ["Sweets", "मिठाई"] },
  { key: "vendors", label: ["Vendors", "वेंडर"] },
];

function CompareGrid({ tiers }: { tiers: PackageTier[] }) {
  const { lang, t } = useLang();
  const [highlight, setHighlight] = useState(true);
  const bi = (v: Bi) => (lang === "hi" ? v[1] : v[0]);

  const cellFor = (tier: PackageTier, key: Row["key"]) => {
    if (key === "vendors") return bi(META[tier.id as TierId].vendors);
    const v = spec(tier.id)[key];
    return v === 0 ? "—" : String(v);
  };
  const upgraded = (key: Row["key"], i: number) => {
    if (!highlight || i === 0) return false;
    if (key === "vendors") return true;
    return spec(tiers[i].id)[key] > spec(tiers[i - 1].id)[key];
  };

  return (
    <div>
      <button
        onClick={() => setHighlight((v) => !v)}
        className="btn-sheen mb-4 rounded-full border border-maroon px-4 py-1.5 text-sm font-semibold text-maroon transition-colors hover:bg-maroon hover:text-cream"
      >
        {highlight ? t("Hide upgrades", "अपग्रेड छुपाएँ") : t("Highlight upgrades", "अपग्रेड दिखाएँ")}
      </button>
      <div className="overflow-hidden rounded-3xl border border-maroon/15">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-maroon text-cream">
              <th className="p-3 text-left font-semibold">{t("What you get", "आपको क्या मिलता है")}</th>
              {tiers.map((tier) => (
                <th key={tier.id} className="p-3 text-center font-semibold">
                  <div className="font-display text-base">{lang === "hi" ? tier.nameHi : tier.name}</div>
                  <div className="text-[11px] font-normal text-cream/85">{tier.price}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, r) => (
              <tr key={String(row.key)} className={r % 2 ? "bg-cream/20" : "bg-white"}>
                <td className="p-3 font-medium text-ink">{bi(row.label)}</td>
                {tiers.map((tier, i) => {
                  const up = upgraded(row.key, i);
                  return (
                    <td key={tier.id} className={`p-3 text-center ${up ? "font-bold text-maroon" : "text-ink"}`}>
                      <span className="inline-flex items-center gap-1">
                        {up && <span aria-hidden>↑</span>}
                        {cellFor(tier, row.key)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */

export default function FinalisedPackages() {
  const { lang, t } = useLang();
  const tiers = packages.filter((p) => p.id !== "custom") as PackageTier[];
  const custom = packages.find((p) => p.id === "custom");

  return (
    <section id="packages" className="relative overflow-hidden py-16 sm:py-20">
      <div className="w-full px-5 sm:px-8 lg:px-12">
        {/* Heading */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl text-maroon sm:text-4xl">
            {t("Find your feast tier", "अपना दावत टियर चुनें")}
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
            {t(
              "Every step up is spelled out — so you always see what the next tier adds.",
              "हर अगला टियर क्या जोड़ता है, यह साफ़ दिखता है।",
            )}
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/50" />
        </Reveal>

        {/* Tier cards */}
        <Reveal stagger className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((tier) => {
            const tierName = lang === "hi" ? tier.nameHi : tier.name;
            return (
              <TierCard
                key={tier.id}
                tier={tier}
                cta={
                  <Link
                    href={`/book?package=${tier.id}&step=menu`}
                    aria-label={`${t("Book", "बुक करें")} ${tierName}`}
                    className={`btn-sheen inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
                      tier.id === "platinum"
                        ? "bg-cream text-maroon ring-1 ring-cream/50"
                        : "bg-maroon text-cream"
                    }`}
                  >
                    <span className="font-display leading-none">
                      {t("Book", "बुक करें")} {tierName}
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                }
              />
            );
          })}
        </Reveal>

        {/* Upgrade path (idea 8) */}
        <Reveal className="mx-auto mt-16 max-w-4xl">
          <p className="mb-5 text-center font-display text-xl text-maroon">
            {t("What each step buys you", "हर कदम आपको क्या देता है")}
          </p>
          <UpgradePath />
        </Reveal>

        {/* Comparison grid (idea 3) */}
        <Reveal className="mx-auto mt-16 max-w-4xl">
          <p className="mb-5 text-center font-display text-xl text-maroon">
            {t("Compare every tier", "हर टियर की तुलना करें")}
          </p>
          <CompareGrid tiers={tiers} />
        </Reveal>

        {/* Single Stall / flexible option — carried from the live theme */}
        {custom && (
          <Reveal className="mx-auto mt-14 max-w-3xl">
            <div className="flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-maroon/40 bg-white px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-maroon ring-1 ring-maroon/40">
                  {t("Most flexible", "सबसे लचीला")}
                </span>
                <h3 className="mt-2 font-display text-2xl text-maroon">
                  {lang === "hi" ? custom.nameHi : custom.name}
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  {t(
                    "One stall, one vendor — build your own menu and pay only for what you pick.",
                    "एक स्टॉल, एक वेंडर — अपना मेन्यू बनाएँ और सिर्फ़ अपनी पसंद के लिए भुगतान करें।",
                  )}
                </p>
              </div>
              <Link
                href="/book?package=custom&step=menu"
                className="btn-sheen inline-flex shrink-0 items-center gap-2 rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                <span className="font-display">{t("Build your own", "अपना बनाएँ")}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </Reveal>
        )}

        {/* Disclaimer — echoes the live section */}
        <Reveal className="mx-auto mt-10 max-w-2xl">
          <p className="rounded-2xl border border-maroon/15 bg-cream/30 px-5 py-3 text-center text-sm text-ink-soft">
            {t(
              "Prices are approximate. Final price may vary as per menu & vendor selection.",
              "कीमतें अनुमानित हैं। अंतिम कीमत मेन्यू और वेंडर के चयन के अनुसार बदल सकती है।",
            )}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
