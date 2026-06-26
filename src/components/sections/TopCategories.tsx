import Image from "next/image";
import { categories } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function TopCategories() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="text-center">
        <h2 className="eyebrow text-2xl text-maroon sm:text-3xl">
          Top Categories
        </h2>
        <p className="font-script mx-auto mt-4 max-w-2xl text-xl text-ink-soft sm:text-2xl">
          Handpicked specialists across every flavour of your celebration.
        </p>
      </Reveal>

      <Reveal
        as="ul"
        stagger
        className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6"
      >
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              className="group flex h-full w-full flex-col items-center gap-3 rounded-2xl border border-cream-3 bg-white p-3 text-center shadow-sm transition hover:-translate-y-1 hover:border-maroon/40 hover:shadow-md"
            >
              <span className="relative aspect-square w-full overflow-hidden rounded-xl bg-cream-2 ring-1 ring-cream-3">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </span>
              <span className="px-1 pb-2 font-display text-sm font-medium text-ink sm:text-base">
                {category.name}
              </span>
            </button>
          </li>
        ))}
      </Reveal>

      <Reveal variant="fade" delay={120} className="mt-12 flex justify-center">
        <button
          type="button"
          className="btn-sheen rounded-full bg-maroon px-8 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-dark hover:shadow-lg active:scale-95"
        >
          View All Categories
        </button>
      </Reveal>
    </section>
  );
}
