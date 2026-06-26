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
  | "bookings"
  | "menu"
  | "addons"
  | "payments"
  | "coupons"
  | "content"
  | "reports"
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
  { label: "Customer Management", href: "/admin/customers", iconKey: "customers" },
  { label: "Booking Management", href: "/admin/bookings", iconKey: "bookings" },
  { label: "Menu & Catalog", href: "/admin/menu", iconKey: "menu" },
  { label: "Add-On Manager", href: "/admin/add-ons", iconKey: "addons" },
  { label: "Payments", href: "/admin/payments", iconKey: "payments" },
  { label: "Coupons", href: "/admin/coupons", iconKey: "coupons" },
  { label: "Content Control", href: "/admin/content", iconKey: "content" },
  { label: "Reports", href: "/admin/reports", iconKey: "reports" },
  { label: "Settings", href: "/admin/settings", iconKey: "settings" },
];
