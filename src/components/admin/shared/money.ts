/**
 * Centralised INR formatting for the admin panel — one copy so every figure
 * formats identically.
 */
export const inr = new Intl.NumberFormat("en-IN");

/** "₹6,74,500" — rounds to whole rupees. */
export const money = (n: number) => `₹${inr.format(Math.round(n))}`;
