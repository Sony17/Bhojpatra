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
  | "customers"
  | "leads"
  | "bookings"
  | "payments"
  | "coupons"
  | "content"
  | "settings";

export interface AdminNavItem {
  label: string;
  href: string;
  iconKey: NavIconKey;
}

export const adminNav: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", iconKey: "dashboard" },
  { label: "Vendors", href: "/admin/vendors", iconKey: "vendors" },
  { label: "Vendor Approvals", href: "/admin/vendor-approvals", iconKey: "approvals" },
  { label: "Customers & Bookings", href: "/admin/customers", iconKey: "customers" },
  { label: "Lead Generation", href: "/admin/leads", iconKey: "leads" },
  { label: "Payments", href: "/admin/payments", iconKey: "payments" },
  { label: "Coupons", href: "/admin/coupons", iconKey: "coupons" },
  { label: "Content Control", href: "/admin/content", iconKey: "content" },
  { label: "Settings", href: "/admin/settings", iconKey: "settings" },
];
