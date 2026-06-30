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
 * span has no intrinsic size), sized to match the source PNG's aspect ratio.
 * The default wordmark is ~894:226 (≈3.96), e.g. `h-14 w-[222px]`; the stacked
 * mark (`/bhojpatra-logo1.png`) is ~460:543 (≈0.85), e.g. `h-24 w-[81px]`.
 */
function maskStyle(src: string): CSSProperties {
  return {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

export default function CreamLogo({
  className,
  src = "/bhojpatra-logo.png",
}: {
  className?: string;
  src?: string;
}) {
  return (
    <span
      role="img"
      aria-label="Bhojpatra"
      style={maskStyle(src)}
      className={"block bg-cream " + (className ?? "")}
    />
  );
}
