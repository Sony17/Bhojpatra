import PageHeader from "@/components/admin/shared/PageHeader";
import KpiGrid from "./KpiGrid";
import RecentBookingsTable from "./RecentBookingsTable";
import RevenueCard from "./RevenueCard";
import PendingApprovalsPanel from "./PendingApprovalsPanel";
import QuickActions from "./QuickActions";
import NotificationsPanel from "./NotificationsPanel";
import AnalyticsSection from "./AnalyticsSection";
import {
  adminProfile,
  adminKpis,
  recentBookings,
  revenueSummary,
  pendingApprovals,
  quickActions,
  adminNotifications,
} from "@/lib/admin/mockData";

/**
 * Dashboard composition (LAYOUT layer). A server component that reads data from
 * the mock layer and passes it as typed props to presentation widgets — no
 * data is hardcoded in any widget, and each widget is API-swappable.
 *
 * Generous `space-y-8` between rows + a clear row grid leave room for future
 * widgets (charts, analytics) to slot in as new rows without a redesign. See the
 * EXTENSION POINT comments below.
 */
export default function AdminDashboard() {
  const firstName = adminProfile.name.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin Panel"
        title="Dashboard"
        subtitle={`Welcome back, ${firstName} — here's your marketplace at a glance.`}
        /*
         * EXTENSION POINT (later phase): pass `actions={<DashboardToolbar />}`
         * here to mount the global search, date-range selector, filters and an
         * export button. Designed for, not implemented in, Phase 1B.
         */
      />

      {/* Row 1 — KPI cards */}
      <KpiGrid kpis={adminKpis} />

      {/* Analytics row — Reports merged into the dashboard (revenue, bookings, vendors). */}
      <AnalyticsSection />

      {/* Row 2 — recent bookings (wide) + revenue summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentBookingsTable
          rows={recentBookings}
          seeAllHref="/admin/customers?tab=bookings"
          className="lg:col-span-2"
        />
        <RevenueCard data={revenueSummary} detailsHref="/admin/payments" />
      </div>

      {/* Row 3 — pending approvals (wide) + quick actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PendingApprovalsPanel
          approvals={pendingApprovals}
          seeAllHref="/admin/vendor-approvals"
          className="lg:col-span-2"
        />
        <QuickActions actions={quickActions} />
      </div>

      {/* Row 4 — notifications (full width) */}
      <NotificationsPanel notifications={adminNotifications} />
    </div>
  );
}
