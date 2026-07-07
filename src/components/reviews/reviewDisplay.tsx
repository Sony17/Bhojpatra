/**
 * Shared read-only display bits for a customer review — a crisp SVG star row
 * with *true fractional fill* (so 4.7 looks like 4.7, not a rounded 5) and the
 * "12 Dec 2026" date format. Used by the vendor profile's reviews summary, the
 * read-only review cards and the author's editable card so every surface
 * renders a review identically.
 *
 * Colours stay on-brand: filled = brand red (`text-maroon`), the empty track =
 * brand cream (`text-cream-3`). Nothing else.
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

const STAR_PATH =
  "M12 2.25l2.955 5.988 6.607.96-4.781 4.66 1.128 6.58L12 18.34l-5.909 3.108 1.128-6.58-4.781-4.66 6.607-.96z";

/** A single filled star glyph — crisp SVG, inherits `currentColor`. */
export function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d={STAR_PATH} />
    </svg>
  );
}

/**
 * Five stars filled to `rating` (0–5) with sub-star precision. Renders a cream
 * "empty" row and clips a red "filled" row over it to the exact fraction.
 * Decorative by default; pass `label` for an accessible name.
 */
export function Stars({
  rating,
  size = 16,
  label,
  className = "",
}: {
  rating: number;
  /** Star edge length in px. */
  size?: number;
  /** Accessible label, e.g. "4.9 out of 5 stars". Omit for decorative use. */
  label?: string;
  className?: string;
}) {
  const gap = Math.max(1, Math.round(size * 0.14));
  const full = size * 5 + gap * 4;
  const pct = (Math.max(0, Math.min(5, rating)) / 5) * 100;

  const row = (color: string) => (
    <span className={`flex ${color}`} style={{ gap, width: full }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="block shrink-0"
        >
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );

  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: full, height: size }}
    >
      {row("text-cream-3")}
      <span
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        {row("text-maroon")}
      </span>
    </span>
  );
}
