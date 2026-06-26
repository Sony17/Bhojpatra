import Image from "next/image";
import { specialists, specialistTabs } from "@/lib/data";

export default function ChooseSpecialists() {
  return (
    <section
      id="specialists"
      className="mx-auto max-w-7xl px-5 py-16 sm:py-20"
    >
      <div className="max-w-2xl">
        <p className="eyebrow text-sm font-medium text-gold">03</p>
        <h2 className="mt-2 text-3xl text-ink sm:text-4xl">
          Choose Specialists
        </h2>
        <p className="mt-3 text-ink-soft">
          Different specialists for every dish — each rated, reviewed, and booked à la carte.
        </p>
      </div>

      {/* Category tabs */}
      <div className="mt-8 flex flex-wrap gap-3">
        {specialistTabs.map((tab, i) => (
          <span
            key={tab}
            className={
              i === 0
                ? "rounded-full bg-maroon px-5 py-2 text-sm font-medium text-cream"
                : "rounded-full bg-cream-2 px-5 py-2 text-sm font-medium text-ink-soft"
            }
          >
            {tab}
          </span>
        ))}
      </div>

      {/* Sub-heading */}
      <h3 className="mt-10 text-xl text-ink sm:text-2xl">
        Select Chaat Specialist
      </h3>

      {/* Specialist list */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm">
        {specialists.map((s, i) => (
          <div
            key={s.id}
            className={
              "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" +
              (i > 0 ? " border-t border-cream-3" : "")
            }
          >
            {/* Left: avatar + details */}
            <div className="flex items-center gap-4">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-cream-3 bg-cream-2">
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
              <span className="inline-flex items-center rounded-full border border-maroon px-4 py-2 text-sm font-medium text-maroon transition-shadow hover:shadow-md">
                View Menu
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Save & Continue */}
      <div className="mt-8 flex justify-end">
        <span className="inline-flex items-center rounded-full bg-maroon px-7 py-3 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-maroon-dark">
          Save &amp; Continue
        </span>
      </div>
    </section>
  );
}