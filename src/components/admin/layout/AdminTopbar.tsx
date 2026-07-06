"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment } from "react";
import { Menu, ChevronRight, LogOut } from "@/components/admin/shared/icons";
import BrandIcon from "@/components/BrandIcon";
import { adminProfile } from "@/lib/admin/mockData";
import { logoutAdmin } from "@/lib/adminAuth";

/** Human labels for admin path segments (drives the breadcrumb). */
const SEGMENT_LABEL: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  vendors: "Vendors",
  "vendor-approvals": "Vendor Approvals",
  customers: "Customers & Bookings",
  leads: "Lead Generation",
  referrals: "Referrals",
  payments: "Payments",
  coupons: "Coupons",
  content: "Content Control",
  reports: "Reports",
  settings: "Settings",
};

interface AdminTopbarProps {
  /** Opens the mobile sidebar drawer. */
  onMenu: () => void;
}

/**
 * Sticky top navigation: hamburger (mobile) + breadcrumb, a notifications bell,
 * a welcome message and the admin avatar.
 * All styling reuses the brand tokens so it matches the public header.
 */
export default function AdminTopbar({ onMenu }: AdminTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const segments = pathname.split("/").filter(Boolean); // e.g. ["admin","vendors"]

  const firstName = adminProfile.name.split(" ")[0];

  return (
    <header className="sticky top-0 z-20 border-b border-cream-3 bg-white/95 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left — menu toggle + breadcrumb */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-cream-3 text-ink transition-colors hover:bg-cream-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/admin/dashboard"
            aria-label="Bhojpatra admin home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md lg:hidden"
          >
            <BrandIcon className="h-8 w-8 bg-maroon" />
          </Link>

          <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
            <ol className="flex items-center gap-1.5 text-sm">
              {segments.map((seg, i) => {
                const href = "/" + segments.slice(0, i + 1).join("/");
                const last = i === segments.length - 1;
                const label = SEGMENT_LABEL[seg] ?? seg;
                return (
                  <Fragment key={href}>
                    {/* Separators + parent crumbs only matter once there's room:
                        on mobile we collapse to just the current page. */}
                    {i > 0 && (
                      <ChevronRight
                        className="hidden h-3.5 w-3.5 shrink-0 text-ink-soft/50 sm:block"
                        aria-hidden="true"
                      />
                    )}
                    {last ? (
                      <span className="truncate font-semibold text-ink">
                        {label}
                      </span>
                    ) : (
                      <Link
                        href={href}
                        className="hidden truncate text-ink-soft transition-colors hover:text-maroon sm:inline"
                      >
                        {label}
                      </Link>
                    )}
                  </Fragment>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Right — profile */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
          <span className="font-script hidden text-base text-ink-soft sm:inline">
            Welcome, {firstName}
          </span>
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-cream sm:h-10 sm:w-10"
            title={`${adminProfile.name} · ${adminProfile.role}`}
          >
            {adminProfile.initials}
          </span>
          <button
            type="button"
            onClick={async () => {
              await logoutAdmin();
              router.replace("/admin/login");
            }}
            aria-label="Log out"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cream-3 text-sm font-medium text-ink transition-colors hover:bg-cream-2 sm:h-auto sm:w-auto sm:px-3 sm:py-2"
          >
            {/* Icon on mobile to save width; full label once there's room. */}
            <LogOut className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
