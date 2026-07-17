"use client";

/**
 * Package Differentiation — Showcase (design playground, not production).
 *
 * Nine self-contained mockups of ways to make Silver → Gold → Platinum read as
 * one clear value ladder inside the package section. Data below is a trimmed,
 * demo-shaped copy of the real tier numbers (see src/lib/data.ts →
 * packageCategoryItems) so this page never pulls server-only code into the
 * client bundle. Brand palette only: red #B92025, cream #F0D09E, black, white.
 */

import { useState } from "react";
import { Button } from "@/components/ui";

/* ── Demo tier data ─────────────────────────────────────────────────────── */

type Spec = {
  welcome: number;
  starters: number;
  live: number;
  chaat: number;
  main: number;
  sweets: number;
  vendors: string;
};

type Tier = {
  id: "silver" | "gold" | "platinum" | "custom";
  name: string;
  price: string;
  unit: string;
  badge: string;
  tagline: string;
  pax: string;
  occasions: string[];
  fill: number; // 0–100, "how loaded" the tier feels
  onlyHere: string;
  addsOverPrev: string[]; // what this tier unlocks vs the one below
  jumpNote: string; // what the price step buys
  spec: Spec;
  dishes: { name: string; img: string }[];
};

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=240&q=60`;

// Reuse the four known-good Unsplash ids the app already ships with.
const SPREAD = {
  silver: "photo-1490645935967-10de6ba17061",
  gold: "photo-1543339308-43e59d6b73a6",
  platinum: "photo-1600891964599-f61ba0e24092",
  custom: "photo-1467003909585-2f8a72700288",
};

const TIERS: Tier[] = [
  {
    id: "silver",
    name: "Silver",
    price: "₹799",
    unit: "/ plate",
    badge: "Best value",
    tagline: "Fixed Menu",
    pax: "50 – 300 guests",
    occasions: ["Birthdays", "Pujas", "Family gatherings"],
    fill: 42,
    onlyHere: "A fixed, fuss-free menu — nothing to plan",
    addsOverPrev: [],
    jumpNote: "",
    spec: { welcome: 1, starters: 2, live: 0, chaat: 0, main: 3, sweets: 1, vendors: "Single vendor" },
    dishes: [
      { name: "Veg thali", img: SPREAD.silver },
      { name: "Dal & rice", img: SPREAD.custom },
      { name: "Gulab jamun", img: SPREAD.gold },
    ],
  },
  {
    id: "gold",
    name: "Gold",
    price: "₹1199",
    unit: "/ plate",
    badge: "Most chosen for weddings",
    tagline: "Popular Choice",
    pax: "150 – 10,000 guests",
    occasions: ["Weddings", "Receptions", "Engagements"],
    fill: 78,
    onlyHere: "Live stalls, chaat & multi-cuisine counters unlocked",
    addsOverPrev: [
      "3 more starters (5 total)",
      "Live stalls",
      "Chaat counters",
      "Chinese & South-Indian",
    ],
    jumpNote: "+₹400 → live counters, chaat & 5 starters",
    spec: { welcome: 1, starters: 5, live: 1, chaat: 2, main: 5, sweets: 3, vendors: "Multiple vendors" },
    dishes: [
      { name: "Live chaat", img: SPREAD.gold },
      { name: "Tandoori grill", img: SPREAD.platinum },
      { name: "Hakka noodles", img: SPREAD.custom },
      { name: "Rasmalai", img: SPREAD.silver },
    ],
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "₹1599+",
    unit: "/ plate",
    badge: "Premium",
    tagline: "Premium Experience",
    pax: "50 – 50,000 guests",
    occasions: ["Grand weddings", "Galas", "VIP events"],
    fill: 100,
    onlyHere: "Famous vendors + the grandest spread, at any guest count",
    addsOverPrev: [
      "A 6th starter",
      "A 2nd live stall",
      "More chaat & sweets",
      "Famous premium vendors",
    ],
    jumpNote: "+₹400 → famous vendors & the fullest spread",
    spec: { welcome: 2, starters: 6, live: 2, chaat: 3, main: 6, sweets: 4, vendors: "Famous vendors" },
    dishes: [
      { name: "Galouti kebab", img: SPREAD.platinum },
      { name: "Dum biryani", img: SPREAD.gold },
      { name: "Shahi tukda", img: SPREAD.silver },
      { name: "Kulfi falooda", img: SPREAD.custom },
    ],
  },
];

const CUSTOM: Tier = {
  id: "custom",
  name: "Single Stall",
  price: "Your price",
  unit: "/ plate",
  badge: "Most flexible",
  tagline: "One stall · one vendor",
  pax: "Any size",
  occasions: ["Any occasion, your way"],
  fill: 60,
  onlyHere: "Pay only for the one stall you pick",
  addsOverPrev: [],
  jumpNote: "",
  spec: { welcome: 2, starters: 6, live: 2, chaat: 3, main: 6, sweets: 4, vendors: "You choose" },
  dishes: [],
};

const NUMERIC = TIERS; // silver, gold, platinum

/* ── Small brand helpers ────────────────────────────────────────────────── */

// Card surface climbs white → cream → red as the tier climbs — the whole
// hierarchy is carried by the four brand colours, no metallic hues.
function cardSurface(id: Tier["id"]) {
  switch (id) {
    case "silver":
      return "bg-white border border-cream text-ink";
    case "gold":
      return "bg-cream border border-[rgba(0,0,0,0.08)] text-ink";
    case "platinum":
      return "bg-maroon border border-maroon text-cream";
    case "custom":
      return "bg-white border-2 border-dashed border-maroon text-ink";
  }
}

function badgeChip(id: Tier["id"]) {
  switch (id) {
    case "silver":
      return "bg-cream text-ink";
    case "gold":
      return "bg-maroon text-cream";
    case "platinum":
      return "bg-cream text-maroon";
    case "custom":
      return "bg-white text-maroon border border-maroon";
  }
}

// muted body text that stays on-brand for the surface it sits on
function muted(id: Tier["id"]) {
  return id === "platinum" ? "text-[rgba(255,255,255,0.72)]" : "text-[rgba(0,0,0,0.6)]";
}

function Badge({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${badgeChip(
        tier.id,
      )} ${className}`}
    >
      {tier.badge}
    </span>
  );
}

/** A horizontal "how much you get" meter. */
function Meter({ value, onDark = false }: { value: number; onDark?: boolean }) {
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full ${
        onDark ? "bg-[rgba(255,255,255,0.22)]" : "bg-[rgba(0,0,0,0.08)]"
      }`}
    >
      <div
        className={`h-full rounded-full ${onDark ? "bg-cream" : "bg-maroon"}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function DishThumb({ name, img, onDark }: { name: string; img: string; onDark?: boolean }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1 text-center">
      <div
        className="h-14 w-14 rounded-full bg-cream bg-cover bg-center ring-1 ring-[rgba(0,0,0,0.08)]"
        style={{ backgroundImage: `url(${unsplash(img)})` }}
      />
      <span
        className={`text-[10px] leading-tight ${
          onDark ? "text-[rgba(255,255,255,0.85)]" : "text-[rgba(0,0,0,0.7)]"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

/** Section framing: index, title, and the "why it works" designer note. */
function DemoSection({
  index,
  title,
  note,
  children,
}: {
  index: string;
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[rgba(0,0,0,0.08)] py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="eyebrow text-xs text-maroon">Idea {index}</p>
        <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>
        <p className={`mt-2 max-w-2xl text-sm text-[rgba(0,0,0,0.6)]`}>{note}</p>
        <div className="mt-8">{children}</div>
      </div>
    </section>
  );
}

/* ── The nine demos ─────────────────────────────────────────────────────── */

// 1 — Stat strip on top of each card
function StatStrip() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {NUMERIC.map((t) => {
        const stats = [
          { n: t.spec.starters, l: "Starters" },
          { n: t.spec.live, l: "Live stalls" },
          { n: t.spec.sweets, l: "Sweets" },
        ];
        return (
          <div key={t.id} className={`rounded-card p-5 ${cardSurface(t.id)}`}>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl">{t.name}</h3>
              <span className="text-sm">
                <span className="text-lg font-semibold">{t.price}</span> {t.unit}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {stats.map((s) => (
                <div
                  key={s.l}
                  className={`rounded-control px-2 py-3 text-center ${
                    t.id === "platinum" ? "bg-[rgba(255,255,255,0.12)]" : "bg-[rgba(185,32,37,0.06)]"
                  }`}
                >
                  <div className="text-2xl font-bold leading-none">{s.n || "—"}</div>
                  <div className={`mt-1 text-[11px] ${muted(t.id)}`}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 2 — Cumulative "Everything in X, plus…"
function Cumulative() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {NUMERIC.map((t, i) => (
        <div key={t.id} className={`rounded-card p-5 ${cardSurface(t.id)}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl">{t.name}</h3>
            <span className="text-sm font-semibold">{t.price}</span>
          </div>
          {i === 0 ? (
            <p className={`mt-4 text-sm ${muted(t.id)}`}>
              The complete fixed menu — welcome drink, 2 starters, mains &amp; a sweet.
            </p>
          ) : (
            <>
              <p className="mt-4 text-[13px] font-semibold uppercase tracking-wide">
                Everything in {NUMERIC[i - 1].name}, plus
              </p>
              <ul className="mt-2 space-y-1.5">
                {t.addsOverPrev.map((a) => (
                  <li key={a} className="flex items-start gap-2 text-sm">
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        t.id === "platinum" ? "bg-cream text-maroon" : "bg-maroon text-cream"
                      }`}
                    >
                      +
                    </span>
                    {a}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// 3 — Side-by-side comparison grid (interactive: emphasise upgrades)
const ROWS: { key: keyof Spec; label: string }[] = [
  { key: "welcome", label: "Welcome drinks" },
  { key: "starters", label: "Starters" },
  { key: "live", label: "Live stalls" },
  { key: "chaat", label: "Chaat counters" },
  { key: "main", label: "Main-course dishes" },
  { key: "sweets", label: "Sweets" },
  { key: "vendors", label: "Vendors" },
];

function cellText(v: number | string) {
  if (typeof v === "string") return v;
  return v === 0 ? "—" : String(v);
}

function isUpgrade(key: keyof Spec, i: number) {
  if (i === 0) return false;
  const cur = NUMERIC[i].spec[key];
  const prev = NUMERIC[i - 1].spec[key];
  if (typeof cur === "number" && typeof prev === "number") return cur > prev;
  return true; // vendors string → each step is an upgrade
}

function CompareGrid() {
  const [highlight, setHighlight] = useState(true);
  return (
    <div>
      <Button
        variant="secondary"
        size="sm"
        className="mb-4 whitespace-nowrap"
        onClick={() => setHighlight((v) => !v)}
      >
        {highlight ? "Hide upgrades" : "Highlight upgrades"}
      </Button>
      <div className="overflow-hidden rounded-card border border-[rgba(0,0,0,0.1)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-maroon text-cream">
              <th className="p-3 text-left font-semibold">What you get</th>
              {NUMERIC.map((t) => (
                <th key={t.id} className="p-3 text-center font-semibold">
                  <div>{t.name}</div>
                  <div className="text-[11px] font-normal text-[rgba(240,208,158,0.85)]">
                    {t.price}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, r) => (
              <tr
                key={row.key}
                className={r % 2 ? "bg-[rgba(240,208,158,0.18)]" : "bg-white"}
              >
                <td className="p-3 font-medium text-ink">{row.label}</td>
                {NUMERIC.map((t, i) => {
                  const up = highlight && isUpgrade(row.key, i);
                  return (
                    <td
                      key={t.id}
                      className={`p-3 text-center ${
                        up ? "font-bold text-maroon" : "text-ink"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {up && <span aria-hidden>↑</span>}
                        {cellText(t.spec[row.key])}
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

// 4 — Fill / progress meter per tier
function FillMeters() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {NUMERIC.map((t) => (
        <div key={t.id} className={`rounded-card p-5 ${cardSurface(t.id)}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl">{t.name}</h3>
            <span className={`text-sm ${muted(t.id)}`}>{t.fill}% of a full feast</span>
          </div>
          <div className="mt-4">
            <Meter value={t.fill} onDark={t.id === "platinum"} />
          </div>
          <p className={`mt-3 text-sm ${muted(t.id)}`}>
            {t.spec.starters} starters · {t.spec.live || "no"} live stalls ·{" "}
            {t.spec.sweets} sweets
          </p>
        </div>
      ))}
    </div>
  );
}

// 5 — "Only here" headline banner pinned to each card
function OnlyHere() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {NUMERIC.map((t) => (
        <div key={t.id} className={`overflow-hidden rounded-card ${cardSurface(t.id)}`}>
          <div
            className={`px-5 py-3 text-sm font-semibold ${
              t.id === "platinum" ? "bg-cream text-maroon" : "bg-maroon text-cream"
            }`}
          >
            Only in {t.name}
          </div>
          <div className="p-5">
            <p className="text-base font-medium">{t.onlyHere}</p>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-lg font-semibold">{t.price}</span>
              <span className={`text-sm ${muted(t.id)}`}>{t.tagline}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 6 — Real dishes, not course names
function DishPreview() {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {NUMERIC.map((t) => (
        <div key={t.id} className={`rounded-card p-5 ${cardSurface(t.id)}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-xl">{t.name}</h3>
            <span className="text-sm font-semibold">{t.price}</span>
          </div>
          <div className="no-scrollbar mt-4 flex flex-nowrap gap-3 overflow-x-auto md:flex-wrap md:overflow-visible">
            {t.dishes.map((d) => (
              <DishThumb key={d.name} name={d.name} img={d.img} onDark={t.id === "platinum"} />
            ))}
          </div>
          <p className={`mt-4 text-xs ${muted(t.id)}`}>
            Actual dishes shown — no abstract “Main Course (Pick Any)”.
          </p>
        </div>
      ))}
    </div>
  );
}

// 7 — Guest-fit & occasion as the differentiator
function GuestFit() {
  const all = [...NUMERIC, CUSTOM];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {all.map((t) => (
        <div key={t.id} className={`rounded-card p-5 ${cardSurface(t.id)}`}>
          <Badge tier={t} />
          <h3 className="mt-3 text-xl">{t.name}</h3>
          <div
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              t.id === "platinum"
                ? "bg-[rgba(255,255,255,0.14)] text-cream"
                : "bg-[rgba(185,32,37,0.08)] text-maroon"
            }`}
          >
            {t.pax}
          </div>
          <div className="no-scrollbar mt-3 flex flex-nowrap gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible">
            {t.occasions.map((o) => (
              <span
                key={o}
                className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${
                  t.id === "platinum"
                    ? "bg-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.9)]"
                    : "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.7)]"
                }`}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// 8 — Price-jump callout between cards
function PriceJump() {
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      {NUMERIC.map((t, i) => (
        <div key={t.id} className="contents">
          {i > 0 && (
            <div className="flex shrink-0 flex-col items-center justify-center px-1 text-center">
              <span className="rounded-full bg-maroon px-3 py-1 text-xs font-bold text-cream">
                {t.jumpNote.split(" → ")[0]}
              </span>
              <span className="mt-1 max-w-[8rem] text-[11px] text-[rgba(0,0,0,0.6)]">
                {t.jumpNote.split(" → ")[1]}
              </span>
            </div>
          )}
          <div className={`flex-1 rounded-card p-5 ${cardSurface(t.id)}`}>
            <h3 className="text-lg">{t.name}</h3>
            <div className="mt-1 text-2xl font-bold">{t.price}</div>
            <p className={`mt-2 text-sm ${muted(t.id)}`}>
              {t.spec.starters} starters · {t.spec.live || "—"} live · {t.spec.sweets} sweets
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// 9 — Differentiated role badges (each tier owns a reason)
function RoleBadges() {
  const all = [...NUMERIC, CUSTOM];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {all.map((t) => (
        <div
          key={t.id}
          className={`flex flex-col items-start gap-3 rounded-card p-5 ${cardSurface(t.id)}`}
        >
          <Badge tier={t} />
          <div>
            <h3 className="text-xl">{t.name}</h3>
            <p className={`text-sm ${muted(t.id)}`}>{t.price} {t.unit}</p>
          </div>
          <p className={`text-sm ${muted(t.id)}`}>{t.onlyHere}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function PackageShowcase() {
  return (
    <div className="pb-24">
      {/* Intro */}
      <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <p className="eyebrow text-xs text-maroon">Design playground</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">Package tier differentiation</h1>
        <p className="mt-3 max-w-2xl text-[rgba(0,0,0,0.65)]">
          Nine ways to make Silver → Gold → Platinum read as one clear value
          ladder inside the package section. These are non-production mockups —
          every card uses only the four brand colours (surfaces climb white →
          cream → red as the tier climbs).
        </p>
        <div className="no-scrollbar mt-5 flex flex-nowrap gap-2 overflow-x-auto text-xs md:flex-wrap md:overflow-visible">
          {[
            "1 · Stat strip",
            "2 · Cumulative",
            "3 · Compare grid",
            "4 · Fill meter",
            "5 · Only-here",
            "6 · Real dishes",
            "7 · Guest-fit",
            "8 · Price jump",
            "9 · Role badges",
          ].map((c) => (
            <span
              key={c}
              className="shrink-0 whitespace-nowrap rounded-full bg-[rgba(185,32,37,0.08)] px-3 py-1 font-medium text-maroon"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <DemoSection
        index="1"
        title="Lead with the numbers that escalate"
        note="A strip of big stat chips at the top of each card. Starters 2 → 5 → 6 and Sweets 1 → 3 → 4 are visible before anyone reads the menu — the eye compares numbers across cards instantly."
      >
        <StatStrip />
      </DemoSection>

      <DemoSection
        index="2"
        title="Cumulative — “Everything in X, plus…”"
        note="Each higher tier is framed as additive: only its new unlocks are listed. Upgrading feels like stacking value rather than re-evaluating a separate menu."
      >
        <Cumulative />
      </DemoSection>

      <DemoSection
        index="3"
        title="One scannable comparison grid"
        note="Same rows, same order, every tier — with each upgrade over the tier below emphasised. Silver's empty cells (— live stalls, — chaat) become a visible reason to move up. Toggle the highlight to see the ladder pop."
      >
        <CompareGrid />
      </DemoSection>

      <DemoSection
        index="4"
        title="A “how full is the feast” meter"
        note="Each tier as a fill bar — Silver ~40%, Gold ~78%, Platinum 100%. A glanceable “how much you get” signal that needs no reading."
      >
        <FillMeters />
      </DemoSection>

      <DemoSection
        index="5"
        title="Pin the one “only here” reason"
        note="Every step gets a banner with the single unlock the tier below can't have — so the reason to choose is never buried in the feature list."
      >
        <OnlyHere />
      </DemoSection>

      <DemoSection
        index="6"
        title="Show food, not course names"
        note="“Main Course (Pick Any)” is abstract. A couple of real dish thumbnails per tier makes each tier feel genuinely different, not just differently priced."
      >
        <DishPreview />
      </DemoSection>

      <DemoSection
        index="7"
        title="Guest-fit & occasion as the differentiator"
        note="Prominent guest-range and occasion chips. Buyers often self-select by event type faster than by feature — Single Stall joins here as “any size, any occasion.”"
      >
        <GuestFit />
      </DemoSection>

      <DemoSection
        index="8"
        title="Justify the price jump inline"
        note="A connector between cards spells out what the extra ₹400/plate buys — at the exact moment of comparison, instead of making buyers infer it."
      >
        <PriceJump />
      </DemoSection>

      <DemoSection
        index="9"
        title="Give every tier a role, not just “Popular”"
        note="Best value · Most chosen · Premium · Most flexible. Each tier owns a distinct reason to pick it, so the four don't blur together."
      >
        <RoleBadges />
      </DemoSection>
    </div>
  );
}
