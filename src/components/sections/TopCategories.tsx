import Image from "next/image";
import { categories } from "@/lib/data";

export default function TopCategories() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <div className="text-center">
        <h2 className="eyebrow text-2xl text-maroon sm:text-3xl">
          Top Categories
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base text-ink-soft">
          Handpicked specialists across every flavour of your celebration.
        </p>
      </div>

      <ul className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
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
      </ul>

      <div className="mt-12 flex justify-center">
        <button
          type="button"
          className="rounded-full bg-maroon px-8 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          View All Categories
        </button>
      </div>
    </section>
  );
}
