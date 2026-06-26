import { whyChoose, type ValueProp } from "@/lib/data";
import Reveal from "@/components/Reveal";

export default function WhyChoose() {
  return (
    <div className="bg-surface-beige-2">
      <section id="about" className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-xs font-semibold text-gold">
            Why Bhojpatra
          </p>
          <h2 className="mt-3 text-3xl text-ink sm:text-4xl">
            Why Choose Bhojpatra?
          </h2>
          <p className="font-script mt-4 text-xl text-ink-soft">
            Everything you need to plan a flawless feast — trusted specialists,
            clear pricing, and support from first click to final bite.
          </p>
        </Reveal>

        <Reveal
          as="ul"
          stagger
          className="mt-12 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5"
        >
          {whyChoose.map((item: ValueProp) => (
            <li
              key={item.title}
              className="card-lift group flex flex-col items-center rounded-2xl border border-cream-3 bg-cream/40 p-6 text-center shadow-sm hover:border-maroon/30 hover:shadow-lg"
            >
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full border border-cream-3 bg-white text-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 [background-image:radial-gradient(circle_at_30%_25%,var(--color-gold-soft)_0%,transparent_70%)]"
              >
                {item.icon}
              </span>
              <h3 className="mt-4 text-base font-medium text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-ink-soft">{item.description}</p>
            </li>
          ))}
        </Reveal>
      </section>
    </div>
  );
}