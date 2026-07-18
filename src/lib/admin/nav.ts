/**
 * Sidebar navigation config for the Admin Panel.
 *
 * Single source of truth for the left sidebar order/labels/routes. The sidebar
 * maps each `iconKey` to an icon component; the topbar derives breadcrumbs from
 * these routes. Add a module here + a matching `src/app/admin/<route>/page.tsx`
 * and it appears automatically.
 */
export type NavIconKey =
  | "dashboard"
  | "vendors"
  | "approvals"
  | "venues"
  | "menus"
  | "customers"
  | "leads"
  | "enquiries"
  | "support"
  | "referrals"
  | "bookings"
  | "payments"
  | "settlements"
  | "refunds"
  | "coupons"
  | "campaigns"
  | "services"
  | "reports"
  | "analytics"
  | "notifications"
  | "content"
  | "roles"
  | "settings";

export interface AdminNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
}

export const adminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", iconKey: "dashboard" },
  { label: "Bookings", href: "/admin/bookings", iconKey: "bookings" },
  { label: "Customers", href: "/admin/customers", iconKey: "customers" },
  { label: "Vendors", href: "/admin/vendors", iconKey: "vendors" },
  { label: "Vendor Approvals", href: "/admin/vendor-approvals", iconKey: "approvals" },
  { label: "Venues", href: "/admin/venues", iconKey: "venues" },
  { label: "Venue Approvals", href: "/admin/venue-approvals", iconKey: "approvals" },
  { label: "Menu Moderation", href: "/admin/menus", iconKey: "menus" },
  { label: "Service Packages", href: "/admin/services", iconKey: "services" },
  { label: "Coupons", href: "/admin/coupons", iconKey: "coupons" },
  { label: "Campaigns", href: "/admin/campaigns", iconKey: "campaigns" },
  { label: "Payments", href: "/admin/payments", iconKey: "payments" },
  { label: "Settlements", href: "/admin/settlements", iconKey: "settlements" },
  { label: "Refunds", href: "/admin/refunds", iconKey: "refunds" },
  { label: "Reports", href: "/admin/reports", iconKey: "reports" },
  { label: "Analytics", href: "/admin/analytics", iconKey: "analytics" },
  { label: "Lead Generation", href: "/admin/leads", iconKey: "leads" },
  { label: "Support Tickets", href: "/admin/support", iconKey: "support" },
  { label: "Enquiries", href: "/admin/enquiries", iconKey: "enquiries" },
  { label: "Referrals", href: "/admin/referrals", iconKey: "referrals" },
  { label: "Notifications", href: "/admin/notifications", iconKey: "notifications" },
  { label: "Content Control", href: "/admin/content", iconKey: "content" },
  { label: "Roles & Permissions", href: "/admin/roles", iconKey: "roles" },
  { label: "Settings", href: "/admin/settings", iconKey: "settings" },
];
