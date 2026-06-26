import Image from "next/image";
import { occasions, type Occasion } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function ChooseOccasion() {
  return (
    <section id="occasions" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal variant="left" className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-maroon font-display text-lg font-semibold text-cream shadow-sm">
          01
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
            Choose Your Occasion
          </h2>
          <p className="font-script mt-1 text-xl text-ink-soft">
            Select the type of celebration you are planning.
          </p>
        </div>
      </Reveal>

      <Reveal
        as="div"
        stagger
        className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4"
      >
        {occasions.map((occasion: Occasion, index: number) => {
          const selected = index === 0;
          return (
            <button
              key={occasion.id}
              type="button"
              aria-pressed={selected}
              className={
                "group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 transition duration-300 hover:-translate-y-1 hover:shadow-lg " +
                (selected
                  ? "ring-2 ring-maroon"
                  : "ring-black/5 hover:ring-black/10")
              }
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={occasion.image}
                  alt={occasion.name}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                />
                {selected && (
                  <span className="absolute right-2 top-2 rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream shadow-sm">
                    Selected
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 px-4 py-3.5">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-2 text-base ring-1 ring-black/5"
                >
                  {occasion.icon}
                </span>
                <span className="font-display text-sm font-semibold text-ink sm:text-base">
                  {occasion.name}
                </span>
              </div>
            </button>
          );
        })}
      </Reveal>

      <Reveal variant="fade" className="mt-12 flex justify-end">
        <button
          type="button"
          className="btn-sheen group rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-dark hover:shadow-lg active:scale-95"
        >
          Next Step{" "}
          <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </button>
      </Reveal>
    </section>
  );
}
