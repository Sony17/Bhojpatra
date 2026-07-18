import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import CountUp from "@/components/CountUp";
import { ChevronRight } from "@/components/admin/shared/icons";

/** Month-over-month (or period-over-period) delta shown under the figure. */
export interface StatTrend {
  /** Rounded, absolute percent change. */
  pct: number;
  direction: "up" | "down" | "flat";
  /** What it's measured against, e.g. "vs last month". */
  caption: string;
}

/**
 * KPI card. Pure & reusable: it takes a typed icon component + display strings,
 * never imports data. Reuses the site's <CountUp> for the animated figure. When
 * `href` is set the whole card becomes a clickable, lifting link. An optional
 * `trend` renders a brand-colored delta line (maroon up / ink down).
 */
interface StatCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  sub?: string;
  href?: string;
  trend?: StatTrend;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  trend,
}: StatCardProps) {
  const surface =
    "block rounded-2xl border border-cream-3 bg-white p-5 shadow-sm";

  const inner = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-maroon">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 font-display text-3xl font-bold text-ink">
        <CountUp value={value} />
      </p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      {trend && <TrendLine trend={trend} />}
      {sub && <p className="mt-0.5 text-xs text-ink-soft">{sub}</p>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${surface} card-lift`}>
        {inner}
      </Link>
    );
  }
  return <div className={surface}>{inner}</div>;
}

/** Delta caption: a directional chevron + signed percent, in brand colors. */
function TrendLine({ trend }: { trend: StatTrend }) {
  const tone =
    trend.direction === "up"
      ? "text-maroon"
      : trend.direction === "down"
        ? "text-ink"
        : "text-ink-soft";
  const sign = trend.direction === "up" ? "+" : trend.direction === "down" ? "-" : "";
  return (
    <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${tone}`}>
      {trend.direction !== "flat" && (
        <ChevronRight
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${trend.direction === "up" ? "-rotate-90" : "rotate-90"}`}
        />
      )}
      <span>
        {sign}
        {trend.pct}%{" "}
        <span className="font-normal text-ink-soft">{trend.caption}</span>
      </span>
    </p>
  );
}
