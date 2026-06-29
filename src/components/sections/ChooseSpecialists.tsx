import Image from "next/image";
import { specialists, specialistTabs } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function ChooseSpecialists() {
  return (
    <section
      id="specialists"
      className="mx-auto max-w-7xl px-5 py-16 sm:py-20"
    >
      <Reveal className="max-w-2xl">
        <h2 className="text-3xl text-ink sm:text-4xl">
          Choose Specialists
        </h2>
        <p className="font-sans mt-3 text-xl text-ink-soft">
          Different specialists for every dish — each rated, reviewed, and booked à la carte.
        </p>
      </Reveal>

      {/* Category tabs */}
      <Reveal stagger className="mt-8 flex flex-wrap gap-3">
        {specialistTabs.map((tab, i) => (
          <span
            key={tab}
            className={
              "cursor-pointer rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 " +
              (i === 0
                ? "bg-maroon text-cream shadow-[0_8px_18px_-8px_rgba(185,32,37,0.6)]"
                : "bg-cream-2 text-ink-soft hover:bg-cream-3 hover:text-maroon")
            }
          >
            {tab}
          </span>
        ))}
      </Reveal>

      {/* Sub-heading */}
      <Reveal as="h3" variant="left" className="mt-10 text-xl text-ink sm:text-2xl">
        Select Chaat Specialist
      </Reveal>

      {/* Specialist list */}
      <Reveal stagger from="right" className="mt-6 overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm">
        {specialists.map((s, i) => (
          <div
            key={s.id}
            className={
              "group flex flex-col gap-4 p-5 transition-colors duration-300 hover:bg-cream/40 sm:flex-row sm:items-center sm:justify-between sm:p-6" +
              (i > 0 ? " border-t border-cream-3" : "")
            }
          >
            {/* Left: avatar + details */}
            <div className="flex items-center gap-4">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-cream-3 bg-cream-2 transition-transform duration-300 group-hover:scale-105 group-hover:border-maroon/40">
                <Image
                  src={s.image}
                  alt={s.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </span>
              <div>
                <p className="font-medium text-ink">{s.name}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                  <span className="inline-flex items-center gap-1 text-gold">
                    <span aria-hidden="true">⭐</span>
                    <span className="font-medium text-ink">{s.rating}</span>
                  </span>
                  <span className="text-ink-soft">
                    ({s.reviews} Reviews)
                  </span>
                  <span aria-hidden="true" className="text-cream-3">
                    •
                  </span>
                  <span className="text-ink-soft">{s.location}</span>
                </p>
              </div>
            </div>

            {/* Right: price + action */}
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-left sm:text-right">
                <p className="text-xs text-ink-soft">Starts at</p>
                <p className="font-display text-lg font-semibold text-maroon">
                  {s.priceFrom}{" "}
                  <span className="text-sm font-normal text-ink-soft">
                    / Plate
                  </span>
                </p>
              </div>
              <span className="inline-flex cursor-pointer items-center rounded-full border border-maroon px-4 py-2 text-sm font-medium text-maroon transition-all duration-300 hover:bg-maroon hover:text-cream hover:shadow-md active:scale-95">
                View Menu
              </span>
            </div>
          </div>
        ))}
      </Reveal>

      {/* Save & Continue */}
      <Reveal variant="fade" className="mt-8 flex justify-end">
        <span className="btn-sheen inline-flex cursor-pointer items-center rounded-full bg-maroon px-7 py-3 text-sm font-medium text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-dark hover:shadow-lg active:scale-95">
          Save &amp; Continue
        </span>
      </Reveal>
    </section>
  );
}