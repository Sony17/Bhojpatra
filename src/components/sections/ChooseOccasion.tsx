import Image from "next/image";
import { occasions, type Occasion } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function ChooseOccasion() {
  return (
    <section
      id="occasions"
      className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20"
    >
      {/* Hairline divider that opens the section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-px max-w-5xl bg-gradient-to-r from-transparent via-maroon/25 to-transparent"
      />
      <Reveal variant="left" className="text-center">
        <h2 className="font-display text-3xl text-maroon sm:text-4xl">
          Occasions
        </h2>
        <p className="font-script mt-4 text-xl text-ink-soft sm:text-2xl">
          Select the type of celebration you are planning.
        </p>
      </Reveal>

      <Reveal
        as="div"
        stagger
        from="alt"
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
                "group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl " +
                (selected
                  ? "ring-2 ring-maroon shadow-md"
                  : "ring-black/[0.06] hover:ring-black/10")
              }
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src={occasion.image}
                  alt={occasion.name}
                  fill
                  sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.07]"
                />
                {selected && (
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-maroon px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream shadow-sm ring-1 ring-white/20">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cream" />
                    Selected
                  </span>
                )}

                {/* Title reads on the image over a merged bottom gradient */}
                <div className="absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3.5 pt-10">
                  <span className="font-display text-sm font-semibold leading-tight text-white drop-shadow-sm sm:text-base">
                    {occasion.name}
                  </span>
                </div>
              </div>

              {/* Maroon accent bar animates in on hover / when selected */}
              <span
                aria-hidden="true"
                className={
                  "h-1 w-full bg-maroon origin-left transition-transform duration-300 ease-out " +
                  (selected ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100")
                }
              />
            </button>
          );
        })}
      </Reveal>
    </section>
  );
}
