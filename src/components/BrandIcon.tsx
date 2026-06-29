import type { CSSProperties } from "react";

/**
 * The Bhojpatra pot/manuscript mark (`/bhojpatra-icon.png`) rendered as a flat
 * single-color silhouette via a CSS mask — the same treatment as
 * {@link ./CreamLogo} but for the square icon glyph rather than the wordmark.
 *
 * Because the fill comes from a `bg-*` class (not the PNG's own pixels), the
 * same source works on any surface: pair it with `bg-cream` on maroon rails and
 * `bg-maroon` on white surfaces so it always stays a brand color with contrast.
 *
 * The icon is ~square (386:388 ≈ 1:1), so use equal width/height, e.g.
 * `h-9 w-9 bg-cream`. The caller must supply size + fill via `className`.
 */
const maskStyle: CSSProperties = {
  WebkitMaskImage: "url(/bhojpatra-icon.png)",
  maskImage: "url(/bhojpatra-icon.png)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

export default function BrandIcon({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Bhojpatra"
      style={maskStyle}
      className={"block " + (className ?? "")}
    />
  );
}
