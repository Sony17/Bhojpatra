/**
 * Dependency-free bar chart (CSS bars, no chart library) for the Reports module.
 * Pure presentation — receives a typed series and an optional value formatter.
 * Matches the project's "no runtime UI deps" ethos.
 *
 * The bars row has an explicit pixel height so each bar's percentage height
 * resolves against a definite parent; labels render in a separate row below.
 */
export interface BarPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarPoint[];
  formatValue?: (n: number) => string;
  /** Bars area height in px (labels render below). */
  height?: number;
}

export default function BarChart({
  data,
  formatValue = (n) => String(n),
  height = 200,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d) => {
          const pct = Math.max(2, Math.round((d.value / max) * 100));
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col justify-end">
              <div
                className="group relative w-full rounded-t-md bg-maroon/85 transition-colors hover:bg-maroon"
                style={{ height: `${pct}%` }}
                title={`${d.label}: ${formatValue(d.value)}`}
              >
                <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-ink opacity-0 transition-opacity group-hover:opacity-100">
                  {formatValue(d.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span
            key={d.label}
            className="flex-1 text-center text-[11px] text-ink-soft"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
