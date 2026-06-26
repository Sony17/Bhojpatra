import Image from "next/image";
import { occasions, cities, steps } from "@/lib/data";
import {
  Calendar,
  MapPin,
  Diya,
  ChefHat,
  UserStar,
  ClipboardCheck,
} from "@/components/icons";

type IconComponent = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;

const stepIcons: Record<string, IconComponent> = {
  diya: Diya,
  chef: ChefHat,
  userStar: UserStar,
  clipboard: ClipboardCheck,
};

export default function Hero() {
  return (
    <section id="home" className="relative isolate flex min-h-screen flex-col overflow-hidden bg-surface-beige">
      {/* Full-bleed hero artwork — spans the entire section edge-to-edge.
          A slow scale-settle ("Ken Burns") gives the still image life. */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero-bg.png"
          alt="A golden Indian wedding feast laid out in brass serving dishes"
          fill
          priority
          sizes="100vw"
          className="animate-kenburns object-cover object-center"
        />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pb-16 pt-32 sm:pt-36 lg:pb-20 lg:pt-44">
        <div className="max-w-xl lg:mt-auto">
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            <span className="animate-rise block whitespace-nowrap">
              Different Specialists.
            </span>
            <span className="animate-rise delay-1 font-script block pt-1 text-6xl font-normal text-maroon sm:text-7xl">
              One Celebration.
            </span>
          </h1>

          <p className="animate-rise delay-2 mt-5 max-w-md text-base text-ink-soft sm:text-lg">
            Plan your perfect celebration with the best specialists from your
            city, state or across India.
          </p>

          {/* Booking bar — two elegant cards: occasion, and city + CTA */}
          <div className="animate-rise delay-3 mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-stretch">
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
                className="btn-sheen shrink-0 rounded-xl bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-[0_6px_16px_-6px_rgba(91,18,24,0.6)] transition-all duration-300 hover:bg-maroon-dark hover:shadow-[0_10px_24px_-8px_rgba(91,18,24,0.7)] active:scale-[0.97] sm:whitespace-nowrap"
              >
                Explore Packages
              </button>
            </div>
          </div>

        </div>

        {/* How It Works — tucked at the very bottom of the hero. The label
            sits beside a compact row of step boxes, with a divider line on
            top; a highlight border walks from one box to the next on a loop. */}
        <div className="animate-rise delay-5 mt-auto max-w-4xl pt-16 sm:pt-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <h2 className="font-display eyebrow shrink-0 text-[11px] font-semibold text-maroon">
              How It Works
            </h2>

            <ol className="flex w-full flex-row items-stretch gap-1.5 sm:w-2/5 sm:gap-2">
              {steps.map((step, i) => {
                const Icon = stepIcons[step.iconKey];
                return (
                  <li
                    key={step.n}
                    style={{
                      animationDelay: `-${((steps.length - i) % steps.length) * (5.6 / steps.length)}s`,
                    }}
                    className="animate-step-trace group flex flex-1 items-center gap-1.5 rounded-lg border border-cream-3/70 bg-white/70 px-1.5 py-1 shadow-[0_8px_22px_-18px_rgba(91,18,24,0.6)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-maroon/30 hover:bg-white hover:shadow-[0_14px_28px_-18px_rgba(91,18,24,0.7)]"
                  >
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon transition-transform duration-300 group-hover:scale-110">
                      <Icon className="h-[11px] w-[11px]" />
                      <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-maroon text-[8px] font-bold leading-none text-cream ring-2 ring-white">
                        {step.n}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold leading-tight text-ink">
                      {step.title}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
