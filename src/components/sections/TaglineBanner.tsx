import { Pot } from "@/components/icons";
import Reveal from "@/components/Reveal";

/**
 * Quarter-mandala corner ornament drawn in cream so it reads as gilded
 * filigree on the maroon band — the kind of corner flourish on a royal
 * wedding invitation. Placed at each of the four corners (rotated to face
 * inward) via the `className` rotation utility.
 */
function CornerMandala({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="var(--color-cream)"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* concentric arcs radiating from the corner */}
      <path d="M2 30 A28 28 0 0 1 30 2" opacity="0.9" />
      <path d="M2 46 A44 44 0 0 1 46 2" opacity="0.7" />
      <path d="M2 62 A60 60 0 0 1 62 2" opacity="0.5" />
      {/* petal fan between the inner arcs */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = ((i * 22.5 + 0) * Math.PI) / 180;
        const x1 = 2 + 14 * Math.cos(a);
        const y1 = 2 + 14 * Math.sin(a);
        const x2 = 2 + 30 * Math.cos(a);
        const y2 = 2 + 30 * Math.sin(a);
        const cx = 2 + 24 * Math.cos(a + Math.PI / 16);
        const cy = 2 + 24 * Math.sin(a + Math.PI / 16);
        return <path key={i} d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} />;
      })}
      {/* small dotted tips along the outer arc */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = ((i * 18 + 0) * Math.PI) / 180;
        return (
          <circle
            key={`d${i}`}
            cx={2 + 52 * Math.cos(a)}
            cy={2 + 52 * Math.sin(a)}
            r="1"
            fill="var(--color-cream)"
            stroke="none"
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}

/** Horizontal filigree flourish that flanks the headline. `flip` mirrors it. */
function Flourish({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 64 16"
      aria-hidden="true"
      className={`h-3 w-16 text-cream/70 ${flip ? "-scale-x-100" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M2 8h30" />
      <path d="M32 8c4 0 6-3 9-3s4 3 7 3" />
      <circle cx="56" cy="8" r="2.2" />
      <path d="M60 8h2" />
    </svg>
  );
}

/**
 * Closing tagline band — the brand sign-off that ends the page. A maroon
 * panel framed by a gilded double border with mandala corner ornaments, a
 * medallion-set handi mark and the two-line cream tagline. Built to read as
 * a royal invitation seal.
 */
export default function TaglineBanner() {
  return (
    <section aria-label="Bhojpatra tagline" className="bg-surface-beige-2">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:py-20">
        <Reveal variant="scale" className="relative overflow-hidden rounded-[1.75rem] bg-maroon shadow-xl">
          {/* Soft radial sheen for depth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(240,208,158,0.16),transparent_55%)]"
          />

          {/* Gilded double-rule frame, inset from the panel edge */}
          <div className="pointer-events-none absolute inset-3 rounded-[1.25rem] border border-cream/55 sm:inset-4" />
          <div className="pointer-events-none absolute inset-[0.875rem] rounded-[1rem] border border-cream/25 sm:inset-[1.125rem]" />

          {/* Four corner mandala ornaments, each rotated to face inward */}
          <CornerMandala className="pointer-events-none absolute left-2 top-2 h-16 w-16 sm:left-3 sm:top-3 sm:h-20 sm:w-20" />
          <CornerMandala className="pointer-events-none absolute right-2 top-2 h-16 w-16 -scale-x-100 sm:right-3 sm:top-3 sm:h-20 sm:w-20" />
          <CornerMandala className="pointer-events-none absolute bottom-2 left-2 h-16 w-16 -scale-y-100 sm:bottom-3 sm:left-3 sm:h-20 sm:w-20" />
          <CornerMandala className="pointer-events-none absolute bottom-2 right-2 h-16 w-16 -scale-100 sm:bottom-3 sm:right-3 sm:h-20 sm:w-20" />

          {/* Content */}
          <div className="relative flex flex-col items-center gap-5 px-8 py-12 text-center sm:px-12 sm:py-14">
            {/* Medallion-set handi mark */}
            <span className="animate-float grid h-16 w-16 place-items-center rounded-full border border-cream/50 bg-gradient-to-br from-cream/20 via-cream/5 to-transparent shadow-inner">
              <Pot className="h-9 w-9 text-cream" />
            </span>

            {/* Flourish divider */}
            <div className="flex items-center gap-3">
              <Flourish />
              <span className="h-1.5 w-1.5 rotate-45 bg-cream/80" />
              <Flourish flip />
            </div>

            {/* Two-line tagline */}
            <h2 className="text-balance text-2xl leading-snug tracking-wide text-cream sm:text-3xl lg:text-[2.1rem]">
              <span className="block">Har Celebration Khaas Hai,</span>
              <span className="mt-1.5 block">
                Bhojpatra Ke Saath Aur Bhi Yaadgaar Hai.
              </span>
            </h2>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
