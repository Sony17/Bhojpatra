/**
 * Shared read-only display bits for a customer review — the five-star row and
 * the "12 Dec 2026" date format. Used by the vendor profile's reviews header,
 * the read-only review cards and the author's editable card so every surface
 * renders a review identically.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** ISO timestamp → "12 Dec 2026" (matches the booking-list date style). */
export function formatReviewDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Five stars, filled up to `rating` (rounded). */
export function Stars({ rating }: { rating: number }) {
  const filled = Math.round(rating);
  return (
    <span aria-hidden="true" className="text-gold">
      {"★".repeat(filled)}
      <span className="text-cream-3">{"★".repeat(Math.max(0, 5 - filled))}</span>
    </span>
  );
}
