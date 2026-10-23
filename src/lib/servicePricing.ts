import type { ServiceGuestTier, ServicePackage } from "@/lib/data";

/**
 * Service-package ("Essentials") pricing by head-count — one source for the
 * customer cards, both booking wizards and the server's order re-pricing, so
 * the price a guest sees is the price `/api/bookings` expects.
 *
 * A package's admin-set `guestTiers` table wins for the band that covers the
 * guest count; outside every band (or with no table) it falls back to the
 * package's `priceMin`.
 */

/** The guest band covering `guests`, if the package's table has one. */
export function serviceTierFor(
  pkg: Pick<ServicePackage, "guestTiers">,
  guests: number,
): ServiceGuestTier | undefined {
  return pkg.guestTiers?.find(
    (t) => guests >= t.minGuests && (t.maxGuests === null || guests <= t.maxGuests),
  );
}

/** The rate charged for `guests` — per guest, or flat when not per-guest. */
export function serviceRate(
  pkg: Pick<ServicePackage, "guestTiers" | "priceMin">,
  guests: number,
): number {
  return serviceTierFor(pkg, guests)?.price ?? pkg.priceMin;
}

/** What the package adds to the order for `guests`. */
export function serviceTotal(
  pkg: Pick<ServicePackage, "guestTiers" | "priceMin" | "perPlate">,
  guests: number,
): number {
  const rate = serviceRate(pkg, guests);
  return pkg.perPlate ? rate * guests : rate;
}

/** "50–100" / "500+" for a tier row. */
export function tierRangeLabel(t: ServiceGuestTier): string {
  return t.maxGuests === null ? `${t.minGuests}+` : `${t.minGuests}–${t.maxGuests}`;
}

/**
 * Clean an incoming tier table: whole non-negative numbers, max ≥ min, sorted
 * by `minGuests`, rows that overlap an earlier one dropped (so a guest count
 * always resolves to one price), and an open-ended row only as the last band.
 */
export function normalizeGuestTiers(raw: unknown): ServiceGuestTier[] {
  if (!Array.isArray(raw)) return [];
  const toInt = (v: unknown) => {
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN;
  };
  const rows: ServiceGuestTier[] = [];
  for (const item of raw) {
    const r = (item ?? {}) as Record<string, unknown>;
    const minGuests = toInt(r.minGuests);
    const price = toInt(r.price);
    if (Number.isNaN(minGuests) || Number.isNaN(price)) continue;
    const rawMax = r.maxGuests;
    const max =
      rawMax === null || rawMax === undefined || rawMax === "" ? null : toInt(rawMax);
    if (Number.isNaN(max)) continue;
    rows.push({ minGuests, maxGuests: max === null ? null : Math.max(minGuests, max), price });
  }
  rows.sort((a, b) => a.minGuests - b.minGuests);
  const out: ServiceGuestTier[] = [];
  for (const row of rows) {
    const prev = out[out.length - 1];
    if (prev && (prev.maxGuests === null || row.minGuests <= prev.maxGuests)) continue;
    out.push(row);
  }
  return out;
}
