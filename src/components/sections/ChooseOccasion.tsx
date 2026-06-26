import Image from "next/image";
import { occasions, type Occasion } from "@/lib/data";

export default function ChooseOccasion() {
  return (
    <section id="occasions" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-maroon font-display text-lg font-semibold text-cream shadow-sm">
          01
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-ink sm:text-3xl">
            Choose Your Occasion
          </h2>
          <p className="mt-1 text-ink-soft">
            Select the type of celebration you are planning.
          </p>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {occasions.map((occasion: Occasion, index: number) => {
          const selected = index === 0;
          return (
            <div
              key={occasion.id}
              className={
                "group flex flex-col items-center gap-4 rounded-xl border p-6 text-center shadow-sm transition " +
                (selected
                  ? "border-maroon bg-cream-2 ring-1 ring-maroon"
                  : "border-cream-3 bg-white hover:border-maroon/40 hover:shadow-md")
              }
            >
              <span className="relative h-16 w-16 overflow-hidden rounded-full bg-gold-soft/40 ring-1 ring-cream-3">
                <Image
                  src={occasion.image}
                  alt={occasion.name}
                  fill
                  sizes="64px"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-xs shadow-sm"
                >
                  {occasion.icon}
                </span>
              </span>
              <span className="font-display text-base font-semibold text-ink sm:text-lg">
                {occasion.name}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          className="rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          Next Step →
        </button>
      </div>
    </section>
  );
}