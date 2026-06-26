import { Fragment } from "react";
import Image from "next/image";
import { steps } from "@/lib/data";
import { ArrowRight } from "@/components/icons";

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="mx-auto max-w-7xl px-5 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="eyebrow text-2xl text-maroon sm:text-3xl">
          How It Works
        </h2>

        {/* Decorative brand ribbon divider */}
        <div
          aria-hidden="true"
          className="mx-auto mt-4 flex items-center justify-center gap-2 text-gold"
        >
          <span className="h-px w-12 bg-gradient-to-r from-transparent to-current" />
          <span className="h-1.5 w-1.5 rotate-45 bg-current" />
          <span className="h-px w-12 bg-gradient-to-l from-transparent to-current" />
        </div>
      </div>

      <ol className="mt-12 flex flex-col items-center gap-10 sm:mt-16 sm:flex-row sm:items-start sm:justify-center sm:gap-2">
        {steps.map((step, i) => (
          <Fragment key={step.n}>
            <li className="flex max-w-[15rem] flex-col items-center text-center">
              <span className="relative flex h-32 w-32 items-center justify-center rounded-full bg-cream/40 p-1.5 ring-1 ring-cream-3 shadow-[0_14px_30px_-18px_rgba(91,18,24,0.5)]">
                <span className="relative h-full w-full overflow-hidden rounded-full">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="128px"
                    className="object-cover object-center"
                  />
                </span>
                <span className="absolute -bottom-1 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-cream ring-4 ring-white">
                  {step.n}
                </span>
              </span>
              <h3 className="mt-6 text-base font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm text-ink-soft">
                {step.description}
              </p>
            </li>

            {i < steps.length - 1 && (
              <li
                aria-hidden="true"
                className="hidden shrink-0 text-gold sm:flex sm:pt-14"
              >
                <ArrowRight className="h-5 w-5" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </section>
  );
}
