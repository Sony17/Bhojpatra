"use client";

/* ─── Step heading ────────────────────────────────────────────────────────
 * The display heading both booking wizards open each step with — a hairline +
 * eyebrow above a font-display title and an optional sub-line. Shared so a step
 * reads identically at /book (tiered feast) and /book/stall (Single Stall).
 */
export default function SectionHead({
  title,
  sub,
  eyebrow = "Curated for you",
  nowrap = false,
}: {
  title: string;
  sub?: string;
  /** Small caps line above the title. Defaults to the tiered wizard's wording. */
  eyebrow?: string;
  /** Keep the title on a single line on web (sm+) — used for short headings. */
  nowrap?: boolean;
}) {
  return (
    <div className="mb-5 sm:mb-7">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-px w-7 bg-maroon" aria-hidden="true" />
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-maroon">
          {eyebrow}
        </span>
      </div>
      <h2
        className={`font-display text-3xl leading-tight text-ink sm:text-4xl${
          nowrap ? " sm:whitespace-nowrap" : ""
        }`}
      >
        {title}
      </h2>
      {sub && (
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-ink/55 break-words sm:text-base">
          {sub}
        </p>
      )}
    </div>
  );
}
