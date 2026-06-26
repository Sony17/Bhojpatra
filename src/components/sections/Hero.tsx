import Image from "next/image";
import { occasions, cities, heroHighlights } from "@/lib/data";
import {
  ShieldCheck,
  PriceTag,
  Compare,
  Calendar,
  Headset,
  MapPin,
} from "@/components/icons";

const highlightIcons: Record<
  string,
  (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
> = {
  shield: ShieldCheck,
  tag: PriceTag,
  compare: Compare,
  calendar: Calendar,
  headset: Headset,
};

export default function Hero() {
  return (
    <section id="home" className="relative isolate overflow-hidden bg-surface-beige">
      {/* Full-bleed hero artwork — spans the entire section edge-to-edge. */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero-bg.png"
          alt="A golden Indian wedding feast laid out in brass serving dishes"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pb-16 pt-32 sm:pt-36 lg:pb-28 lg:pt-44">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            <span className="block whitespace-nowrap">Different Specialists.</span>
            <span className="block">One Celebration.</span>
          </h1>

          <p className="mt-5 max-w-md text-base text-ink-soft sm:text-lg">
            Plan your perfect celebration with the best specialists from your
            city, state or across India.
          </p>

          {/* Booking bar — two elegant cards: occasion, and city + CTA */}
          <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch">
            {/* Occasion card */}
            <div className="relative flex-1 rounded-2xl border border-maroon/40 bg-white shadow-[0_10px_30px_-12px_rgba(91,18,24,0.25)] transition-shadow focus-within:border-maroon focus-within:shadow-[0_14px_36px_-12px_rgba(91,18,24,0.35)]">
              <select
                aria-label="Select Occasion"
                defaultValue=""
                className="h-full w-full cursor-pointer appearance-none rounded-2xl bg-transparent px-5 py-3.5 pr-11 text-sm text-ink outline-none"
              >
                <option value="" disabled>
                  Select Occasion
                </option>
                {occasions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <Calendar className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon/70" />
            </div>

            {/* City + CTA card */}
            <div className="relative flex flex-[1.4] items-stretch overflow-hidden rounded-2xl border border-maroon/40 bg-white p-1.5 shadow-[0_10px_30px_-12px_rgba(91,18,24,0.25)] transition-shadow focus-within:border-maroon focus-within:shadow-[0_14px_36px_-12px_rgba(91,18,24,0.35)]">
              <div className="relative flex-1">
                <select
                  aria-label="Select Location"
                  defaultValue=""
                  className="h-full w-full cursor-pointer appearance-none rounded-xl bg-transparent px-3.5 py-2 pr-9 text-sm text-ink outline-none"
                >
                  <option value="" disabled>
                    Select Location
                  </option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <MapPin className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon/70" />
              </div>

              <button
                type="button"
                className="shrink-0 rounded-xl bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_-6px_rgba(91,18,24,0.6)] transition-colors hover:bg-maroon-dark sm:whitespace-nowrap"
              >
                Explore Packages
              </button>
            </div>
          </div>

          {/* Highlights */}
          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-5">
            {heroHighlights.map((h) => {
              const Icon = highlightIcons[h.iconKey];
              return (
                <div
                  key={h.title}
                  className="flex w-[84px] flex-col items-center gap-2 text-center"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-maroon/20 bg-white text-maroon shadow-[0_4px_12px_-6px_rgba(91,18,24,0.35)] backdrop-blur-sm">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-ink/70">
                    {h.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
