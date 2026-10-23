"use client";

import Image from "next/image";
import { Stepper } from "@/components/ui";

/* ─── Wizard hero ─────────────────────────────────────────────────────────
 * The editorial opening both booking flows lead with — a maroon-flooded feast
 * photo behind an eyebrow, a display headline and a row of reassurance chips.
 * Phones drop it entirely for a minimal, low-scroll flow; it returns untouched
 * at sm+ (tablet / desktop).
 */
export function WizardHero({
  eyebrow,
  title,
  sub,
  chips,
  aside,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  chips: string[];
  /** Optional link / control pinned to the hero's top-right (e.g. the cross-flow
   *  hand-off between the tiered packages and the Single Stall plan). */
  aside?: React.ReactNode;
}) {
  return (
    <div className="relative isolate hidden overflow-hidden rounded-[1.75rem] bg-maroon px-5 py-7 shadow-brand sm:block sm:rounded-[2rem] sm:px-9 sm:py-10 lg:px-12 lg:py-12">
      {/* Feast photo backdrop, dimmed and flooded maroon so the white
          headline stays legible and the brand red still reads dominant. */}
      <Image
        src="/hero-feast.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="(max-width: 1440px) 100vw, 1440px"
        className="absolute inset-0 -z-10 object-cover object-center opacity-30"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-maroon via-maroon/85 to-maroon/40"
      />
      <span
        aria-hidden="true"
        className="absolute -right-12 -top-20 h-56 w-56 rounded-full border-[34px] border-cream/15"
      />
      <span
        aria-hidden="true"
        className="absolute -bottom-20 right-[22%] h-44 w-44 rounded-full bg-cream/10"
      />
      {aside && (
        <div className="absolute right-5 top-5 z-10 sm:right-9 lg:right-12">
          {aside}
        </div>
      )}
      <div className="relative max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-cream" />
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cream sm:text-xs">
            {eyebrow}
          </p>
        </div>
        <h1 className="mt-3 font-display text-[2rem] font-normal leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:mt-4 sm:text-lg">
          {sub}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.05em] text-cream sm:mt-6 sm:gap-2 sm:text-xs sm:tracking-[0.12em]">
          {chips.map((chip) => (
            <span
              key={chip}
              className="whitespace-nowrap rounded-full border border-cream/35 bg-black/10 px-2 py-1 sm:px-3 sm:py-1.5"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Progress rail ───────────────────────────────────────────────────────
 * Where the guest is in the flow, plus a plain-language "you're here / next up"
 * line so they always know what they're picking now and what comes after.
 * Phones get a slim non-sticky bar; tablet / desktop get the full stepper card.
 */
export function ProgressRail({
  t,
  step,
  totalSteps,
  stepLabels,
  onStartOver,
  compact = false,
}: {
  t: (en: string, hi: string) => string;
  /** Phones only: a numbered stepper (circles + labels) with "Start over"
   *  under it — the app-style header the Single Stall flow uses.
   *  Tablet / desktop are unchanged. */
  compact?: boolean;
  /** 1-based current step. */
  step: number;
  totalSteps: number;
  stepLabels: string[];
  /** Escape hatch — clears the persisted draft and every pick. Only offered once
   *  past the first step, where there are selections worth discarding. */
  onStartOver?: () => void;
}) {
  const nextStepLabel = step < totalSteps ? stepLabels[step] : "";
  return (
    <>
      {compact && (
        <div className="-mt-1 flex items-center gap-1.5 sm:hidden">
          {/* Step cards — one tile per step, the same shape as the Essentials
              package tiles: the current step gets the red border and cream
              fill; done steps carry a ✓, the ones ahead their number. */}
          <ol
            className="grid min-w-0 flex-1 gap-1.5"
            // The current step's card gets a little more room so its name
            // never truncates.
            style={{
              gridTemplateColumns: Array.from({ length: totalSteps }, (_, i) =>
                i + 1 === step ? "minmax(0, 1.4fr)" : "minmax(0, 1fr)",
              ).join(" "),
            }}
            aria-label={t(`Step ${step} of ${totalSteps}`, `चरण ${step} / ${totalSteps}`)}
          >
            {stepLabels.slice(0, totalSteps).map((label, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              return (
                <li
                  key={label}
                  aria-current={active ? "step" : undefined}
                  className={
                    "flex min-w-0 items-center justify-center gap-1 rounded-lg border px-1 py-1 " +
                    (active
                      ? "border-[1.5px] border-maroon bg-cream/20"
                      : "border-cream-3/70 bg-white")
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      "grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold leading-none " +
                      (active
                        ? "bg-maroon text-white"
                        : done
                          ? "bg-cream text-maroon"
                          : "bg-cream/50 text-ink/50")
                    }
                  >
                    {done ? "✓" : n}
                  </span>
                  <span
                    className={
                      "min-w-0 truncate text-[10.5px] font-semibold leading-none " +
                      (active ? "text-maroon" : done ? "text-ink" : "text-ink/55")
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
          {/* Start over — a restart icon at the rail's end, same height as
              the stepper, so it costs no row of its own. */}
          {onStartOver && (
            <button
              type="button"
              onClick={onStartOver}
              aria-label={t("Start over", "फिर से शुरू करें")}
              title={t("Start over", "फिर से शुरू करें")}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-cream text-ink/55 transition-colors hover:border-maroon hover:text-maroon active:scale-95"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          )}
        </div>
      )}
      {/* Phones — a slim, non-sticky progress bar + "Step X of Y · Label".
          (The shared sticky chrome is desktop-only via sm:static, and its
          sticky offset — meant to sit under a hero that phones no longer
          show — would otherwise cover the event chip below.) */}
      <div
        className={
          compact
            ? "hidden"
            : "mx-2 -mt-6 rounded-card border border-cream bg-white px-3 py-2.5 shadow-soft min-[375px]:px-4 sm:hidden"
        }
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
          {t(`Step ${step} of ${totalSteps}`, `चरण ${step} / ${totalSteps}`)}
        </p>
        {/* One segment per step with its name underneath — every step is
            visible and evenly spaced, so "what's next" needs no extra line. */}
        <ol
          className="mt-2 grid gap-1 min-[375px]:gap-2"
          style={{ gridTemplateColumns: `repeat(${stepLabels.length}, minmax(0, 1fr))` }}
        >
          {stepLabels.map((label, i) => {
            const done = i < step - 1;
            const active = i === step - 1;
            return (
              <li key={label} aria-current={active ? "step" : undefined}>
                <span
                  className={`block h-1.5 rounded-full transition-colors duration-300 ${
                    done || active ? "bg-maroon" : "bg-cream"
                  }`}
                />
                <span
                  className={`mt-1.5 block whitespace-nowrap text-center text-[9px] leading-tight tracking-tight min-[375px]:text-[10px] min-[440px]:text-[11px] min-[440px]:tracking-normal ${
                    active
                      ? "font-semibold text-maroon"
                      : done
                        ? "font-medium text-ink"
                        : "font-medium text-ink/45"
                  }`}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      {/* Tablet / desktop — the full stepper. */}
      <div className="app-sticky-chrome relative z-20 mx-2 -mt-3 hidden rounded-card border border-cream bg-white px-4 py-3 shadow-pop sm:static sm:mx-5 sm:-mt-5 sm:block sm:rounded-2xl sm:px-6 sm:py-5 lg:mx-8">
        <Stepper current={step - 1} steps={stepLabels} />
        <p className="mt-2 text-[12px] text-ink/55 sm:mt-3 sm:text-sm sm:text-ink-soft">
          {t(`Step ${step} of ${totalSteps}`, `चरण ${step} / ${totalSteps}`)} ·{" "}
          <span className="font-semibold text-maroon">{stepLabels[step - 1]}</span>
          {nextStepLabel && (
            <>
              {" "}
              <span className="hidden text-ink-soft/70 sm:inline">
                {t("· Next: ", "· आगे: ")}
              </span>
              <span className="hidden font-semibold text-ink sm:inline">
                {nextStepLabel}
              </span>
            </>
          )}
        </p>
      </div>
      {onStartOver && (
        <div
          className={
            "mx-2 mt-2 justify-end sm:mx-5 lg:mx-8 " +
            (compact ? "hidden sm:flex" : "flex")
          }
        >
          <button
            type="button"
            onClick={onStartOver}
            className="text-[11px] font-semibold text-ink/50 underline underline-offset-2 transition-colors hover:text-maroon sm:text-xs"
          >
            {t("Start over", "फिर से शुरू करें")}
          </button>
        </div>
      )}
    </>
  );
}
