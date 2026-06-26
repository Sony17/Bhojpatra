import Image from "next/image";
import { packages, type PackageTier } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function Packages() {
  return (
    <section id="packages" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-sm font-semibold text-gold">02</p>
        <h2 className="mt-3 text-3xl text-ink sm:text-4xl">Select Your Package</h2>
        <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
          Choose a package as per your preference.
        </p>
      </Reveal>

      <Reveal
        stagger
        className="mt-12 grid grid-cols-1 gap-6 sm:mt-14 lg:grid-cols-3"
      >
        {packages.map((tier) => (
          <PricingCard key={tier.id} tier={tier} />
        ))}
      </Reveal>
    </section>
  );
}

function PricingCard({ tier }: { tier: PackageTier }) {
  const popular = tier.popular === true;

  return (
    <div
      className={[
        "card-lift group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-xl",
        popular
          ? "border-gold ring-1 ring-gold lg:-mt-2 lg:mb-2"
          : "border-cream-3",
      ].join(" ")}
    >
      {/* Food banner */}
      <div className="relative h-40 w-full overflow-hidden">
        <Image
          src={tier.image}
          alt={`${tier.name} package spread`}
          fill
          sizes="(min-width: 1024px) 33vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/35 to-transparent" />
        {popular && (
          <span className="absolute right-4 top-4 rounded-full bg-gold px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
            Popular Choice
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-8 pt-7">
      <h3 className="font-display text-2xl text-ink">{tier.name}</h3>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="text-4xl font-bold text-maroon">{tier.price}</span>
        <span className="text-sm text-ink-soft">{tier.unit}</span>
      </div>

      <ul className="mt-7 flex flex-1 flex-col gap-3.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-ink-soft">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-soft/30 text-xs font-bold text-gold"
            >
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={[
          "btn-sheen mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
          popular
            ? "bg-maroon text-cream hover:bg-maroon-dark"
            : "border border-maroon text-maroon hover:bg-maroon hover:text-cream",
        ].join(" ")}
      >
        Select {tier.name}
      </button>
      </div>
    </div>
  );
}