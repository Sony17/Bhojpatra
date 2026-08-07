import { Fragment } from "react";

/**
 * The tier differentiator line — the three claims that separate a package from
 * the tier above and below it (brand reach · menu freedom · occasion scale),
 * e.g. Silver's "One Brand • Fixed Menu • Small Functions".
 *
 * Claims come from `PackageTier.differentiator` / `differentiatorHi`; the
 * caller picks the language and passes the array in. Separators are the same
 * rotated cream rhombus the package menus use, so the line reads engraved
 * rather than as three loose chips.
 *
 * The patra scroll card (`PackageScrollCard`) renders its own copy of this
 * line in container-query units so it scales with the artwork — this component
 * serves every ordinary-CSS surface (the Single Stall banner, the /finalise
 * tier cards).
 */
export default function TierDifferentiator({
  claims,
  className = "",
  tone = "maroon",
}: {
  claims: string[];
  className?: string;
  /** `cream` for the dark (Platinum) card, `maroon` everywhere else. */
  tone?: "maroon" | "cream";
}) {
  if (claims.length === 0) return null;
  const text = tone === "cream" ? "text-cream" : "text-maroon";
  const dot = tone === "cream" ? "bg-cream/50" : "bg-maroon/40";
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-semibold leading-snug ${text} ${className}`}
    >
      {claims.map((claim, i) => (
        <Fragment key={claim}>
          {i > 0 && (
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rotate-45 ${dot}`}
            />
          )}
          <span>{claim}</span>
        </Fragment>
      ))}
    </p>
  );
}
