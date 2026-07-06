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
  | "enquiries"
  | "referrals"
  | "bookings"
  | "payments"
  | "coupons"
  | "campaigns"
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
  { label: "Enquiries", href: "/admin/enquiries", iconKey: "enquiries" },
  { label: "Referrals", href: "/admin/referrals", iconKey: "referrals" },
  { label: "Payments", href: "/admin/payments", iconKey: "payments" },
  { label: "Coupons", href: "/admin/coupons", iconKey: "coupons" },
  { label: "Campaigns", href: "/admin/campaigns", iconKey: "campaigns" },
  { label: "Content Control", href: "/admin/content", iconKey: "content" },
  { label: "Settings", href: "/admin/settings", iconKey: "settings" },
];
