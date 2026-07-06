"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandIcon from "@/components/BrandIcon";
import type { ComponentType, SVGProps } from "react";
import { adminNav, type NavIconKey } from "@/lib/admin/nav";
import {
  Grid,
  Store,
  ShieldCheck,
  Users,
  Megaphone,
  Mail,
  Share,
  Calendar,
  Wallet,
  Ticket,
  Rocket,
  Layout,
  Gear,
  LogOut,
  Close,
} from "@/components/admin/shared/icons";

/** Maps each nav item's icon key to its component. */
const NAV_ICON: Record<NavIconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  dashboard: Grid,
  vendors: Store,
  approvals: ShieldCheck,
  customers: Users,
  leads: Megaphone,
  enquiries: Mail,
  referrals: Share,
  bookings: Calendar,
  payments: Wallet,
  coupons: Ticket,
  campaigns: Rocket,
  content: Layout,
  settings: Gear,
};

interface AdminSidebarProps {
  /** Mobile drawer open state. On lg+ the sidebar is always visible. */
  open: boolean;
  onClose: () => void;
}

/**
 * Fixed left sidebar (Zoho-CRM style): brand-maroon rail with cream text,
 * active-item highlight, and an off-canvas drawer on mobile. The rail itself is
 * `fixed`, so the main content scrolls independently while the sidebar stays put.
 */
export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside
      className={
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-maroon text-cream transition-transform duration-300 ease-out lg:translate-x-0 " +
        (open ? "translate-x-0" : "-translate-x-full")
      }
    >
      {/* Brand header */}
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Link
          href="/admin/dashboard"
          onClick={onClose}
          className="inline-flex items-center gap-2.5"
        >
          <BrandIcon className="h-9 w-9 shrink-0 bg-cream" />
          <span className="font-display text-2xl leading-none text-cream">
            bhojpatra
          </span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-cream/80 transition-colors hover:bg-maroon-dark hover:text-cream lg:hidden"
        >
          <Close className="h-5 w-5" />
        </button>
      </div>

      <p className="eyebrow px-5 pb-2 text-xs font-medium text-cream/55">
        Platform Control
      </p>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-1">
          {adminNav.map((item) => {
            const Icon = NAV_ICON[item.iconKey];
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors " +
                    (active
                      ? "bg-cream/15 font-semibold text-cream"
                      : "font-medium text-cream/80 hover:bg-maroon-dark hover:text-cream")
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer — back to public site */}
      <div className="border-t border-cream/15 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-cream/80 transition-colors hover:bg-maroon-dark hover:text-cream"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span>Back to site</span>
        </Link>
      </div>
    </aside>
  );
}
