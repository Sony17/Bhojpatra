import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QA — Page Links",
  robots: { index: false, follow: false },
};

// Dev/QA-only index of every route in the app, as tappable links for mobile
// testing. Links are relative, so this works over localhost or a LAN IP
// (e.g. http://192.168.x.x:3000/test-links) with no hardcoded host.

type Route = { href: string; label: string; note?: string };
type Group = { title: string; routes: Route[] };

const GROUPS: Group[] = [
  {
    title: "Public / Marketing",
    routes: [
      { href: "/", label: "Home" },
      { href: "/about", label: "About" },
      { href: "/careers", label: "Careers" },
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/compare", label: "Compare" },
      { href: "/service-packages", label: "Service Packages" },
      { href: "/finalise", label: "Finalise" },
      { href: "/refund", label: "Refund" },
    ],
  },
  {
    title: "Booking",
    routes: [
      { href: "/book", label: "Book (Wizard)" },
      { href: "/bookings", label: "My Bookings" },
      { href: "/bookings/invoice", label: "Invoice" },
    ],
  },
  {
    title: "Vendors",
    routes: [
      { href: "/vendors", label: "Vendors Catalog" },
      { href: "/vendors/vl-1", label: "Vendor Detail", note: "sample id" },
    ],
  },
  {
    title: "Venues",
    routes: [
      { href: "/venues", label: "Venues Catalog" },
      {
        href: "/venues/ambassador-banquet",
        label: "Venue Detail",
        note: "sample id",
      },
    ],
  },
  {
    title: "Account",
    routes: [{ href: "/dashboard", label: "Customer Dashboard" }],
  },
  {
    title: "Auth",
    routes: [
      { href: "/login", label: "Login" },
      { href: "/signup", label: "Sign Up" },
      { href: "/forgot-password", label: "Forgot Password" },
      { href: "/reset-password", label: "Reset Password" },
    ],
  },
  {
    title: "Partner",
    routes: [
      { href: "/partner", label: "Partner Landing" },
      { href: "/partner/dashboard", label: "Partner Dashboard" },
    ],
  },
  {
    title: "Vendor Onboarding",
    routes: [
      { href: "/vendor/register", label: "Vendor Register" },
      { href: "/vendor/dashboard", label: "Vendor Dashboard" },
    ],
  },
  {
    title: "Admin",
    routes: [
      { href: "/admin/login", label: "Admin Login" },
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/analytics", label: "Analytics" },
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/campaigns", label: "Campaigns" },
      { href: "/admin/content", label: "Content" },
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/customers", label: "Customers" },
      { href: "/admin/enquiries", label: "Enquiries" },
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/menus", label: "Menus" },
      { href: "/admin/notifications", label: "Notifications" },
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/referrals", label: "Referrals" },
      { href: "/admin/refunds", label: "Refunds" },
      { href: "/admin/reports", label: "Reports" },
      { href: "/admin/roles", label: "Roles" },
      { href: "/admin/services", label: "Services" },
      { href: "/admin/settings", label: "Settings" },
      { href: "/admin/settlements", label: "Settlements" },
      { href: "/admin/support", label: "Support" },
      { href: "/admin/vendor-approvals", label: "Vendor Approvals" },
      { href: "/admin/vendors", label: "Vendors" },
      { href: "/admin/venue-approvals", label: "Venue Approvals" },
      { href: "/admin/venues", label: "Venues" },
    ],
  },
];

export default function TestLinksPage() {
  const total = GROUPS.reduce((n, g) => n + g.routes.length, 0);

  return (
    <main className="min-h-screen bg-[#F0D09E] px-4 py-6 text-black">
      <div className="mx-auto max-w-md">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#B92025]">Page Links — QA</h1>
          <p className="mt-1 text-sm text-black/70">
            {total} routes for mobile testing. Tap any row to open.
          </p>
        </header>

        <div className="space-y-6">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/60">
                {group.title} ({group.routes.length})
              </h2>
              <ul className="overflow-hidden rounded-xl border border-[#B92025]/20 bg-white">
                {group.routes.map((route) => (
                  <li
                    key={route.href}
                    className="border-b border-[#000000]/10 last:border-b-0"
                  >
                    <Link
                      href={route.href}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 active:bg-[#F0D09E]/40"
                    >
                      <span className="flex flex-col">
                        <span className="text-sm font-medium">
                          {route.label}
                        </span>
                        <span className="text-xs text-black/50">
                          {route.href}
                          {route.note ? ` · ${route.note}` : ""}
                        </span>
                      </span>
                      <span aria-hidden className="text-[#B92025]">
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
