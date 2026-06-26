import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import CountUp from "@/components/CountUp";

/**
 * KPI card. Pure & reusable: it takes a typed icon component + display strings,
 * never imports data. Reuses the site's <CountUp> for the animated figure. When
 * `href` is set the whole card becomes a clickable, lifting link.
 */
interface StatCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  sub?: string;
  href?: string;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
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
