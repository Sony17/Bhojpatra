import type { ReactNode } from "react";
import Reveal from "@/components/Reveal";

interface ReviewRow {
  category: string;
  vendor: string;
  icon: string;
}

const rows: ReviewRow[] = [
  { category: "Welcome Drink", vendor: "Mocktail Mojito", icon: "🍹" },
  { category: "Starters", vendor: "6 Items Selected", icon: "🍢" },
  { category: "Live Counters", vendor: "3 Live Counters", icon: "🍳" },
  { category: "Main Course", vendor: "Royal Rajest Caterers", icon: "🍲" },
  { category: "South Indian", vendor: "Dosa House", icon: "🥘" },
  { category: "Sweet Stall", vendor: "Ram Asraj Sweets", icon: "🍬" },
];

function IconBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-soft/40 text-lg ring-1 ring-cream-3 transition-transform duration-300 group-hover:scale-110">
      {children}
    </span>
  );
}

export default function ReviewSelection() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
      <Reveal className="mb-10 max-w-2xl">
        <h2 className="text-3xl font-semibold text-ink sm:text-4xl">
          Review Your Selection
        </h2>
        <p className="font-script mt-3 text-xl text-ink-soft sm:text-2xl">
          Review your selected menu &amp; specialists.
        </p>
      </Reveal>

      <Reveal variant="scale" className="rounded-2xl border border-cream-3 bg-white shadow-sm">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-cream-3 bg-cream-2/40">
                <th className="eyebrow px-6 py-4 text-xs font-semibold text-ink-soft">
                  Category
                </th>
                <th className="eyebrow px-6 py-4 text-xs font-semibold text-ink-soft">
                  Selected Vendor
                </th>
                <th className="eyebrow px-6 py-4 text-xs font-semibold text-ink-soft">
                  View Menu
                </th>
                <th className="eyebrow px-6 py-4 text-right text-xs font-semibold text-ink-soft">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.category}
                  className="group border-b border-cream-3 last:border-b-0 transition-colors hover:bg-cream/60"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <IconBadge>{row.icon}</IconBadge>
                      <span className="font-medium text-ink">
                        {row.category}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-ink-soft">{row.vendor}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-lg border border-cream-3 bg-cream px-3.5 py-1.5 text-xs font-semibold text-maroon transition-colors hover:bg-cream-2">
                      View Menu
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="cursor-default text-sm font-semibold text-maroon underline-offset-4 hover:underline">
                      Change
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total row */}
        <div className="flex flex-col gap-4 border-t border-cream-3 bg-cream-2/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="eyebrow text-xs font-semibold text-ink-soft">
            Total (Approx.)
          </span>
          <span className="font-display text-2xl font-semibold text-maroon sm:text-3xl">
            ₹19,000{" "}
            <span className="text-base font-normal text-ink-soft sm:text-lg">
              / 200 Plates
            </span>
          </span>
        </div>
      </Reveal>

      {/* Action buttons */}
      <Reveal variant="fade" delay={120} className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <span className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-maroon/30 bg-white px-6 py-3 text-sm font-semibold text-maroon shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-cream hover:shadow-md active:scale-95">
          Download Menu
        </span>
        <span className="btn-sheen group inline-flex cursor-pointer items-center justify-center rounded-xl bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-maroon-dark hover:shadow-lg active:scale-95">
          Proceed to Book{" "}
          <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </Reveal>
    </section>
  );
}
