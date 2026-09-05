/* ─── Single Stall draft ──────────────────────────────────────────────────
 * The half-built Single Stall order, held in session storage so a guest can
 * leave the wizard — to browse the Brands page for their stall, to sign in —
 * and come back to everything they'd already filled in.
 *
 * It lives here rather than inside the wizard because the tiered wizard writes
 * to it too: when a guest switches plans mid-flow it seeds the event brief so
 * the Single Stall path never re-asks for what it already knows.
 *
 * Deliberately NOT shared with the tiered wizard's own draft — a Single Stall
 * order and a tiered feast are different shapes and must never rehydrate into
 * each other.
 */

/** category id → chosen dish ids. Dish ids are vendor-scoped (`${vendorId}-${i}`)
 *  and only unique *within* a course, so picks stay keyed by course. */
export type StallItemMap = Record<string, string[]>;

export type StallDraft = {
  step: number;
  stallId: string;
  activeCat: number;
  categoryItems: StallItemMap;
  occasionId: string;
  customOccasion: string;
  guests: number;
  eventDate: string;
  mealTime: string;
  eventTime: string;
  foodPreference: string;
  /** Craft-my-plate — the non-veg count dialled in for a "Both" event. The
   *  split itself is derived from this plus `foodPreference` (`resolveNonVeg`),
   *  so a legacy draft without the key simply resumes with no mix set. */
  nonVegMix: number | null;
  venue: string;
  venueFee: number;
  selectedAddOns: string[];
  addOnVendor: Record<string, string>;
  serviceId: string;
};

/** v2 drops the v1 drafts, whose `step` numbers belong to the retired 4-step
 *  flow (which opened on a stall picker the Brands page now replaces). */
const DRAFT_KEY = "bhojpatra:booking:stall:draft:v2";

export function readStallDraft(): Partial<StallDraft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<StallDraft>) : null;
  } catch {
    return null; // storage disabled / corrupt JSON — fall back to a fresh start
  }
}

export function writeStallDraft(draft: StallDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full / disabled — persistence is best-effort */
  }
}

export function clearStallDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** The event brief a guest has already given — carried across when they leave
 *  the tiered flow for the Single Stall one. Merged into (never replacing) an
 *  existing draft, and only for the fields actually set, so a stall and menu
 *  picked earlier in the session survive. */
export function seedStallDraftBrief(brief: Partial<StallDraft>): void {
  if (typeof window === "undefined") return;
  const set = Object.fromEntries(
    Object.entries(brief).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
  if (Object.keys(set).length === 0) return;
  writeStallDraft({ ...(readStallDraft() ?? {}), ...set } as StallDraft);
}
