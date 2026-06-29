import type { CSSProperties } from "react";

/**
 * The Bhojpatra logo rendered as a solid brand-cream (#F0D09E) silhouette.
 *
 * Used on maroon surfaces (admin rail, auth brand panel) where the red logo
 * would clash. Implemented with a CSS mask so the fill is the exact brand
 * cream regardless of the source PNG's own colors — the same flat-silhouette
 * treatment the auth panel used for white, but yellow instead of red.
 *
 * The caller must supply both width and height via `className` (the masked
 * span has no intrinsic size). The logo's aspect ratio is ~894:226 (≈3.96),
 * so pair heights with widths that keep that ratio, e.g. `h-14 w-[222px]`.
 */
const maskStyle: CSSProperties = {
  WebkitMaskImage: "url(/bhojpatra-logo.png)",
  maskImage: "url(/bhojpatra-logo.png)",
  WebkitMaskRepeat: "no-repeat",
  maskRepeat: "no-repeat",
  WebkitMaskPosition: "center",
  maskPosition: "center",
  WebkitMaskSize: "contain",
  maskSize: "contain",
};

export default function CreamLogo({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Bhojpatra"
      style={maskStyle}
      className={"block bg-cream " + (className ?? "")}
    />
  );
}
