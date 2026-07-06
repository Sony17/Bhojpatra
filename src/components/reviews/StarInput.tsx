"use client";

import { useState } from "react";

/**
 * Interactive 1–5 star picker with hover/focus preview. Shared by the My
 * Bookings review editor and the vendor-page "rate this caterer" panel so both
 * surfaces use one identical control.
 */
export default function StarInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (rating: number) => void;
  label: (n: number) => string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1 text-3xl text-gold" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={label(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onFocus={() => setHover(n)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(n)}
          className="leading-none transition-transform hover:scale-110"
        >
          <span className={n <= shown ? "" : "opacity-25"}>★</span>
        </button>
      ))}
    </div>
  );
}
