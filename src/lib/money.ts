/**
 * Centralised INR formatting — one copy so every figure formats identically.
 */
export const inr = new Intl.NumberFormat("en-IN");

/** "₹6,74,500" — rounds to whole rupees. */
export const money = (n: number) => `₹${inr.format(Math.round(n))}`;

/** All-in per-plate cost of a total (total ÷ guests), in whole rupees — shown
 *  beside every grand total so a lakhs-scale figure reads as a per-head rate
 *  rather than a scary lump sum. 0 when the headcount is unknown, so callers
 *  can hide the line. */
export const perPlateCost = (total: number, guests: number): number =>
  guests > 0 ? Math.round(total / guests) : 0;
