import Reveal from "@/components/Reveal";

export default function CtaBanner() {
  return (
    <section id="start-planning" className="bg-maroon text-cream">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:py-28">
        <Reveal variant="scale" className="flex flex-col items-center text-center">
          {/* Decorative diya badge */}
          <div className="animate-float grid h-16 w-16 place-items-center rounded-full border border-cream/40 bg-gradient-to-br from-cream/25 via-cream/10 to-transparent text-3xl shadow-sm">
            <span role="img" aria-label="diya">
              🪔
            </span>
          </div>

          {/* Thin cream divider */}
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-10 bg-cream/50" />
            <span className="h-1.5 w-1.5 rotate-45 bg-cream" />
            <span className="h-px w-10 bg-cream/50" />
          </div>

          {/* Two-line display message */}
          <h2 className="mt-8 max-w-3xl text-balance text-3xl leading-tight text-cream sm:text-4xl lg:text-5xl">
            <span className="block">Har Celebration Khaas Hai,</span>
            <span className="mt-2 block text-white">
              Bhojpatra Ke Saath Aur Bhi Yaadgar Hai.
            </span>
          </h2>

          {/* CTA button (presentational placeholder) */}
          <span className="btn-sheen mt-10 inline-flex cursor-pointer items-center justify-center rounded-full bg-cream px-8 py-3.5 text-sm font-semibold tracking-wide text-maroon shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl active:scale-95">
            Start Planning
          </span>
        </Reveal>
      </div>
    </section>
  );
}
