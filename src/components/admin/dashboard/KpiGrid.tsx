import StatCard from "@/components/admin/shared/StatCard";
import { adminIcon } from "@/components/admin/shared/iconMap";
import type { AdminKpi } from "@/lib/admin/types";

/**
 * Responsive grid of KPI cards. Pure presentation — receives the metrics array
 * and renders one <StatCard> each, resolving the icon from the data-driven key.
 */
export default function KpiGrid({ kpis }: { kpis: AdminKpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {kpis.map((kpi) => (
        <StatCard
          key={kpi.key}
          icon={adminIcon[kpi.iconKey]}
          label={kpi.label}
          value={kpi.value}
          sub={kpi.sub}
          href={kpi.href}
        />
      ))}
    </div>
  );
}
