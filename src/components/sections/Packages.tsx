import { packages, type PackageTier } from "@/lib/data";
import Reveal from "@/components/Reveal";

/** Decorative corner ribbon per tier — pure styling, not menu content. */
const cornerLabel: Record<string, string> = {
  gold: "Most Popular",
  platinum: "Royal Choice",
};

export default function Packages() {
  return (
    <section
      id="packages"
      className="relative overflow-hidden bg-gradient-to-b from-ink via-ink to-black py-20 sm:py-24"
    >
      {/* Ambient warm glow so the dark band still reads as the brand. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-maroon/30 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-cream/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-sm font-semibold text-cream">02</p>
          <h2 className="mt-3 text-3xl text-cream sm:text-4xl">Select Your Package</h2>
          <p className="font-script mt-4 text-xl text-cream/70 sm:text-2xl">
            Choose a package as per your preference.
          </p>
        </Reveal>

        <Reveal
          stagger
          from="right"
          className="mt-14 grid grid-cols-1 items-center gap-6 sm:mt-16 lg:grid-cols-3"
        >
          {packages.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

function PricingCard({ tier }: { tier: PackageTier }) {
  const popular = tier.popular === true;
  const badge = cornerLabel[tier.id];

  return (
    <div
      className={[
        "card-lift group relative z-0 flex flex-col rounded-3xl border p-7 backdrop-blur-sm sm:p-8",
        popular
          ? "z-10 border-cream/55 bg-gradient-to-b from-cream/[0.22] to-cream/[0.05] shadow-[0_0_60px_-12px_rgba(240,208,158,0.45)] lg:-my-3 lg:py-11"
          : "border-cream/15 bg-cream/[0.035] hover:border-cream/30",
      ].join(" ")}
    >
      {/* Corner ribbon */}
      {badge && (
        <span
          className={[
            "absolute right-5 top-5 rounded-full px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide",
            popular
              ? "bg-gradient-to-r from-cream to-cream-3 text-maroon shadow-sm"
              : "border border-cream/40 text-cream/80",
          ].join(" ")}
        >
          {badge}
        </span>
      )}

      {/* Tier pill */}
      <span className="mx-auto rounded-full border border-cream/30 bg-cream/10 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cream">
        {tier.name}
      </span>

      {/* Title + price */}
      <h3 className="mt-5 text-center font-display text-3xl text-cream">
        {tier.name} Menu
      </h3>
      <p className="mt-2 text-center text-sm text-cream/65">
        <span className="text-lg font-semibold text-cream">{tier.price}</span>{" "}
        {tier.unit}
      </p>

      {/* Divider */}
      <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-cream/70 to-transparent" />

      {/* Feature rows — two-column layout echoing the reference menu list */}
      <ul className="mt-7 flex flex-1 flex-col">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-center justify-between gap-4 border-b border-cream/10 py-3 text-left text-sm text-cream/85"
          >
            <span>{feature}</span>
            <span
              aria-hidden="true"
              className="shrink-0 text-base font-semibold text-cream"
            >
              ✓
            </span>
          </li>
        ))}
      </ul>

      {/* CTAs */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          className={[
            "btn-sheen w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
            popular
              ? "bg-gradient-to-r from-cream to-cream-3 text-maroon hover:brightness-105"
              : "bg-maroon text-cream hover:bg-maroon-dark",
          ].join(" ")}
        >
          {popular ? "Book This Menu" : `Select ${tier.name}`}
        </button>
        <button
          type="button"
          className="w-full rounded-xl border border-cream/30 px-5 py-3 text-sm font-semibold text-cream/90 transition-colors duration-300 hover:bg-cream/10 active:scale-[0.98]"
        >
          Enquire Now
        </button>
      </div>
    </div>
  );
}
