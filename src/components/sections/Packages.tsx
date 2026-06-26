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
      className="relative overflow-hidden bg-gradient-to-b from-surface-beige to-surface-beige-2 py-20 sm:py-24"
    >
      {/* Soft brand-warm glow on the beige band. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-maroon/[0.06] blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-sm font-semibold text-maroon">02</p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Select Your Package</h2>
          <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
            Choose a package as per your preference.
          </p>
          <Ornament className="mx-auto mt-6 text-maroon/50" />
        </Reveal>

        <Reveal
          stagger
          from="right"
          className="mt-12 grid grid-cols-1 items-center gap-7 sm:mt-14 lg:grid-cols-3"
        >
          {packages.map((tier) => (
            <PricingCard key={tier.id} tier={tier} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/** Slim line–diamond–line flourish used under headings and titles. */
function Ornament({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex w-28 items-center justify-center gap-2 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-70" />
      <span className="h-1.5 w-1.5 rotate-45 bg-current" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-70" />
    </span>
  );
}

function PricingCard({ tier }: { tier: PackageTier }) {
  const popular = tier.popular === true;
  const badge = cornerLabel[tier.id];

  return (
    <div
      className={[
        "card-lift group relative z-0 flex flex-col overflow-hidden rounded-[1.75rem] border p-8 sm:p-9",
        popular
          ? "z-10 border-cream/70 bg-gradient-to-b from-maroon to-maroon-dark shadow-[0_28px_60px_-20px_rgba(185,32,37,0.7)] ring-1 ring-cream/40 lg:-my-4 lg:py-12"
          : "border-maroon-dark/30 bg-maroon shadow-[0_16px_44px_-22px_rgba(185,32,37,0.6)]",
      ].join(" ")}
    >
      {/* Top sheen + engraved inner frame for a refined, framed look. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-cream/[0.14] to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 rounded-[1.35rem] border border-cream/15"
      />

      {/* Corner ribbon */}
      {badge && (
        <span
          className={[
            "absolute right-6 top-6 z-20 rounded-full px-3.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide",
            popular
              ? "bg-gradient-to-r from-cream to-cream-3 text-maroon shadow-sm"
              : "border border-cream/45 text-cream/85",
          ].join(" ")}
        >
          {badge}
        </span>
      )}

      <div className="relative z-10 flex flex-1 flex-col">
        {/* Tier pill */}
        <span className="mx-auto rounded-full border border-cream/35 bg-cream/10 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-cream">
          {tier.name}
        </span>

        {/* Title + price */}
        <h3 className="mt-5 text-center font-display text-3xl tracking-wide text-cream">
          {tier.name} Menu
        </h3>
        <p className="mt-2 text-center text-sm text-cream/65">
          <span className="text-xl font-semibold text-cream">{tier.price}</span>{" "}
          {tier.unit}
        </p>

        {/* Ornamental divider */}
        <Ornament className="mx-auto mt-5 text-cream/65" />

        {/* Feature rows — two-column layout echoing the reference menu list */}
        <ul className="mt-7 flex flex-1 flex-col">
          {tier.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center justify-between gap-4 border-b border-cream/12 py-3 text-left text-sm text-cream/90 last:border-b-0"
            >
              <span>{feature}</span>
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream/12 text-[0.7rem] font-bold text-cream ring-1 ring-cream/25"
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
              "btn-sheen w-full rounded-xl px-5 py-3 text-sm font-semibold tracking-wide transition-all duration-300 active:scale-[0.98]",
              popular
                ? "bg-gradient-to-r from-cream to-cream-3 text-maroon shadow-sm hover:brightness-105"
                : "bg-cream text-maroon hover:bg-cream-2",
            ].join(" ")}
          >
            {popular ? "Book This Menu" : `Select ${tier.name}`}
          </button>
          <button
            type="button"
            className="w-full rounded-xl border border-cream/40 px-5 py-3 text-sm font-semibold tracking-wide text-cream transition-colors duration-300 hover:bg-cream/10 active:scale-[0.98]"
          >
            Enquire Now
          </button>
        </div>
      </div>
    </div>
  );
}
