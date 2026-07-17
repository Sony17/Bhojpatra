import type { ReactNode } from "react";

/**
 * Standard admin page header — eyebrow + display title + script subtitle, with
 * an optional actions slot on the right. Mirrors the `DashboardHeader` styling
 * used in the existing VendorDashboard so admin pages feel native.
 */
interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="eyebrow text-sm font-medium text-gold">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-2xl text-ink sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="font-script mt-1 text-lg text-ink-soft">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
