/**
 * Which of the 7 V2 services a vendor actually opted into — the single source
 * of truth the vendor dashboard gates every service-specific surface with
 * (pure, client-safe, no I/O; unit-tested in `vendorServices.test.ts`).
 *
 * Where the choice lives
 * ----------------------
 * Onboarding step 3 ("Offerings") writes `serviceCategories` — ids from the
 * platform's catering categories (`full-catering`, `single-stall`,
 * `baina-box`, plus the older `live-stall` / `essential`) — and, under Feast,
 * the `cateringComponents` toggles (Live Counters, Feast Extras, Essentials,
 * Add-ons). The wizard autosaves them onto the vendor's live catalog record
 * (PUT /api/vendor/menu), and the application carries a copy
 * (`cateringCategories` / `cateringComponents`) that GET /api/vendor/menu
 * returns as `prefill` until a record exists. Both have the same field names,
 * so this helper accepts either shape.
 *
 * How it resolves
 * ---------------
 *   • DECLARED — the vendor has a (known) `serviceCategories` selection. That
 *     selection is the whole truth: leftover data for a service they never
 *     picked (a stall-only vendor's old counters, a box list, plated dishes
 *     that Single Stall shares) never makes the service appear.
 *       feast  ← `full-catering`      stall ← `single-stall`
 *       baina  ← `baina-box`
 *       counters ← Feast + Live Counters component on, or `live-stall`
 *       essentials ← Feast + Essentials component on, or `essential`
 *       extras / addons ← Feast + that component on
 *     Feast components only exist under Feast. A Feast vendor whose record
 *     predates `cateringComponents` (nothing recorded) gets each component
 *     only if it has data, so nobody sees empty "Add +" rows for something
 *     they never set up.
 *   • INFERRED (legacy fallback) — no recorded selection (records saved before
 *     categories existed, curated seeds, a half-finished draft). We infer from
 *     what the vendor demonstrably sells so nobody loses access:
 *       feast ← dishes in the five plated courses, stall ← stall categories,
 *       baina ← Baina boxes, counters ← counters, extras ← custom offerings,
 *       addons ← a tableware tier, essentials ← an Essential Service offer.
 *     A vendor with no selection AND nothing configured gets no services (the
 *     dashboard then points them to Profile & KYC to pick their offerings).
 *
 * Nothing here writes or deletes data — it only decides what to present.
 */
import type { LiveVendorRecord } from "@/lib/vendorMenus";

export type VendorServiceId =
  | "feast"
  | "stall"
  | "baina"
  | "counters"
  | "extras"
  | "addons"
  | "essentials";

/** The 7 V2 services, in handover order. */
export const VENDOR_SERVICE_ORDER: readonly VendorServiceId[] = [
  "feast",
  "stall",
  "baina",
  "counters",
  "extras",
  "addons",
  "essentials",
];

/** Bilingual display names (new, dashboard-wide labels). */
export const VENDOR_SERVICE_NAMES: Record<VendorServiceId, { en: string; hi: string }> = {
  feast: { en: "Feast Booking", hi: "फ़ीस्ट बुकिंग" },
  stall: { en: "Single Stall", hi: "सिंगल स्टॉल" },
  baina: { en: "Baina Boxes", hi: "बैना बॉक्स" },
  counters: { en: "Live Counters", hi: "लाइव काउंटर" },
  extras: { en: "Extras", hi: "एक्स्ट्रा" },
  addons: { en: "Add-ons", hi: "ऐड-ऑन" },
  essentials: { en: "Essentials", hi: "एसेंशियल्स" },
};

/** Platform catering-category ids a vendor can declare. */
const KNOWN_CATEGORIES = [
  "full-catering",
  "single-stall",
  "live-stall",
  "baina-box",
  "essential",
] as const;

/** The five plated courses a Feast menu is built from. */
const FEAST_COURSES = ["welcome", "starters", "main", "breads", "sweets"];

/** The slice of a vendor record (live record, or application prefill) the
 *  resolver reads — every field optional so a partial prefill works. */
export type VendorServicesInput = Partial<
  Pick<
    LiveVendorRecord,
    | "serviceCategories"
    | "cateringComponents"
    | "menu"
    | "stallConfig"
    | "bainaBoxes"
    | "counters"
    | "customOfferings"
    | "cutleryTier"
    | "essentialService"
  >
>;

export interface OptedServices {
  /** Opted services, in handover order. */
  ids: VendorServiceId[];
  /** `declared` = the vendor's own onboarding selection; `inferred` = legacy
   *  fallback from existing data (see the file header). */
  source: "declared" | "inferred";
  /** Platform catering-category ids this resolves to, in platform order — what
   *  the menu builder's segment bar may offer. */
  categories: string[];
}

function feastDishCount(v: VendorServicesInput): number {
  return (v.menu ?? [])
    .filter((s) => FEAST_COURSES.includes(s.categoryId))
    .reduce((n, s) => n + (s.items?.length ?? 0), 0);
}

/** Resolve the services a vendor opted into. Safe for null / partial input. */
export function optedServices(vendor: VendorServicesInput | null | undefined): OptedServices {
  const v = vendor ?? {};
  const declared = (v.serviceCategories ?? []).filter((c): c is (typeof KNOWN_CATEGORIES)[number] =>
    (KNOWN_CATEGORIES as readonly string[]).includes(c),
  );
  const on = new Set<VendorServiceId>();
  let source: OptedServices["source"];

  if (declared.length) {
    source = "declared";
    const feast = declared.includes("full-catering");
    if (feast) on.add("feast");
    if (declared.includes("single-stall")) on.add("stall");
    if (declared.includes("baina-box")) on.add("baina");
    if (declared.includes("live-stall")) on.add("counters");
    if (declared.includes("essential")) on.add("essentials");
    if (feast) {
      const comps = v.cateringComponents;
      const has: Record<"counters" | "extras" | "essentials" | "addons", boolean> = {
        counters: Boolean(v.counters?.length),
        extras: Boolean(v.customOfferings?.length),
        essentials: Boolean(v.essentialService),
        addons: Boolean(v.cutleryTier),
      };
      for (const key of ["counters", "extras", "essentials", "addons"] as const) {
        // Recorded toggles win; with none recorded, only what has data counts.
        const optedIn = comps ? comps[key] !== false && (key !== "extras" || comps.extras === true || has.extras) : has[key];
        if (optedIn) on.add(key);
      }
    }
  } else {
    source = "inferred";
    if (feastDishCount(v) > 0) on.add("feast");
    if (v.stallConfig?.categories?.length) on.add("stall");
    if (v.bainaBoxes?.length) on.add("baina");
    if (v.counters?.length) on.add("counters");
    if (v.customOfferings?.length) on.add("extras");
    if (v.cutleryTier) on.add("addons");
    if (v.essentialService) on.add("essentials");
  }

  const ids = VENDOR_SERVICE_ORDER.filter((id) => on.has(id));
  const categories = KNOWN_CATEGORIES.filter(
    (c) =>
      (c === "full-catering" && on.has("feast")) ||
      (c === "single-stall" && on.has("stall")) ||
      (c === "baina-box" && on.has("baina")) ||
      (c === "live-stall" && on.has("counters")) ||
      (c === "essential" && on.has("essentials")),
  );
  return { ids, source, categories };
}

/** Whether the vendor opted into one service. */
export function isServiceOpted(vendor: VendorServicesInput | null | undefined, id: VendorServiceId): boolean {
  return optedServices(vendor).ids.includes(id);
}

/** True when any of the given services is opted. */
export function hasAnyService(opted: OptedServices, ...ids: VendorServiceId[]): boolean {
  return ids.some((id) => opted.ids.includes(id));
}
