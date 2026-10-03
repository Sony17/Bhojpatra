"use client";

/**
 * Vendor Portal (handover: vendor-registration-v2/index.html — desktop
 * dashboard shell + 390px mobile dashboard shell). Owns the full viewport: red
 * sidebar + sticky topbar on desktop, AppBar + fixed bottom nav on mobile.
 * Dashboard · My Services · Orders are live; Calendar, Finances, Reviews and
 * Profile & KYC are "Soon". Wired to GET /api/vendor/menu (the vendor's live
 * record) and GET/PATCH /api/vendor/orders.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import CreamLogo from "@/components/CreamLogo";
import MenuBuilder from "@/components/vendor/MenuBuilder";
import BainaBoxSpecial from "@/components/BainaBoxSpecial";
import type { LiveVendorRecord } from "@/lib/vendorMenus";
import type { VendorOrderSummary } from "@/lib/vendorOrders";
import { sortTiers } from "@/lib/admin/types";
import { cn } from "@/components/ui/cn";
import { logout } from "@/lib/session";
import { BtnBack, BtnNext, DIET_NAMES, Sheet, stallCategoryName } from "@/components/vendor/portalUi";

type Tab = "dashboard" | "services" | "orders";
interface OrdersPayload {
  pending: VendorOrderSummary[];
  confirmed: VendorOrderSummary[];
  completed: VendorOrderSummary[];
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
/** ₹48,500 → ₹48.5k, ₹1,17,000 → ₹1.17L (mobile metric tiles). */
function inrCompact(n: number) {
  const v = Math.round(n || 0);
  const trim = (x: number, d: number) => String(Number(x.toFixed(d)));
  if (v >= 100000) return `₹${trim(v / 100000, 2)}L`;
  if (v >= 1000) return `₹${trim(v / 1000, 1)}k`;
  return `₹${v}`;
}
/** "19:30" → "7:30 PM". */
function time12(t?: string) {
  const m = t?.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t || "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

function eventDate(o: VendorOrderSummary) {
  const d = o.eventDateISO ? new Date(o.eventDateISO) : new Date(o.date);
  return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDate(o: VendorOrderSummary, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  const d = eventDate(o);
  return d ? d.toLocaleDateString("en-IN", opts) : o.date;
}
/** "Sat, 12 Dec 2026" (en-IN would add a comma before the year). */
function fmtLong(o: VendorOrderSummary) {
  const d = eventDate(o);
  if (!d) return o.date;
  const p = (opt: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-IN", opt);
  return `${p({ weekday: "short" })}, ${p({ day: "numeric" })} ${p({ month: "short" })} ${p({ year: "numeric" })}`;
}
const title = (o: VendorOrderSummary) => `${o.occasion} (${o.customer})`;
const place = (o: VendorOrderSummary) => [o.venue, o.city].filter(Boolean).join(", ") || o.city;
const pkg = (o: VendorOrderSummary) => o.service?.name || o.invoice?.packageName || "";

/* ── Icons (handover SVG paths, Material) ─────────────────────────────────── */
const ICONS = {
  dashboard: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  services:
    "M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z",
  orders:
    "M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z",
  calendar:
    "M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z",
  wallet:
    "M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
  star: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  shield: "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z",
  help: "M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.34 5L2 22l5.25-1.38c1.45.79 3.08 1.25 4.75 1.25 5.52 0 10-4.48 10-10S17.52 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z",
  edit: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
  bell: "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
  alert: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  clock:
    "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
  event: "M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z",
  pin: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
  people:
    "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  note: "M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z",
  print:
    "M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  logout: "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
  more: "M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z",
  scale:
    "M12 3c-.55 0-1 .45-1 1v1H5.5L3 11c0 1.66 1.34 3 3 3s3-1.34 3-3L6.97 7H11v12H7v2h10v-2h-4V7h4.03L15 11c0 1.66 1.34 3 3 3s3-1.34 3-3l-2.5-6H13V4c0-.55-.45-1-1-1zM6 8.6 7.6 11H4.4L6 8.6zm12 0 1.6 2.4h-3.2L18 8.6z",
} as const;
type IconName = keyof typeof ICONS;
function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={cn("shrink-0", className)}>
      <path d={ICONS[name]} />
    </svg>
  );
}

const SOON: { label: string; icon: IconName; toast: string }[] = [
  { label: "Calendar", icon: "calendar", toast: "Calendar scheduling module — Coming Soon" },
  { label: "Finances", icon: "wallet", toast: "Partner finances & payouts — Coming Soon" },
  { label: "Reviews", icon: "star", toast: "Customer reviews & ratings — Coming Soon" },
  { label: "Profile & KYC", icon: "shield", toast: "Statutory profile & compliance — Coming Soon" },
];
const TIER_LABEL: Record<string, string> = { Silver: "Silver / Bhoj City", Gold: "Gold / Bhoj Signature", Platinum: "Platinum / Bhoj Royale" };
const BREADCRUMB: Record<Tab, string> = { dashboard: "Dashboard Home", services: "My Services", orders: "Orders" };

/* Shared surface styles (handover: .metric-card / .health-card / .feed-panel). */
const CARD = "rounded-card border border-cream/30 bg-white shadow-card";
const PILL = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold";

export default function VendorDashboard() {
  const [vendor, setVendor] = useState<LiveVendorRecord | null>(null);
  const [fallbackName, setFallbackName] = useState("");
  const [gallery, setGallery] = useState<{ id: string }[]>([]);
  const [orders, setOrders] = useState<OrdersPayload>({ pending: [], confirmed: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [review, setReview] = useState<VendorOrderSummary | null>(null);
  const [prep, setPrep] = useState<VendorOrderSummary | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [now] = useState(() => Date.now());

  const flash = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadOrders = useCallback(async () => {
    const r = await fetch("/api/vendor/orders").catch(() => null);
    if (r?.ok) {
      const d = await r.json();
      setOrders({ pending: d.pending ?? [], confirmed: d.confirmed ?? [], completed: d.completed ?? [] });
    }
  }, []);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await fetch("/api/vendor/menu").catch(() => null);
      if (r?.ok && live) {
        const d = await r.json();
        if (d.vendor) setVendor(d.vendor);
        else setFallbackName(d.prefill?.business ?? "");
        setGallery(d.gallery ?? []);
      }
      await loadOrders();
      if (live) setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [loadOrders]);

  const act = async (o: VendorOrderSummary, action: "accept" | "decline") => {
    const r = await fetch(`/api/vendor/orders/${encodeURIComponent(o.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    flash(r?.ok ? (action === "accept" ? "Booking accepted & capacity confirmed." : "Booking declined — the Bhojpatra team will follow up with the customer.") : d?.error || "Could not update booking.");
    setReview(null);
    await loadOrders();
  };

  const name = vendor?.business || fallbackName || "Your Business";
  const tier = vendor?.tiers?.length ? sortTiers(vendor.tiers).slice(-1)[0] : undefined;
  const diet = vendor?.dietaryOffering ? DIET_NAMES[vendor.dietaryOffering] : undefined;
  const live = vendor?.moderation === "Approved";
  const services = useMemo(() => buildServices(vendor), [vendor]);
  const configured = services.filter((s) => s.configured);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  // Upcoming = confirmed events from today onward, soonest first.
  const today = new Date(now).setHours(0, 0, 0, 0);
  const upcoming = orders.confirmed
    .filter((o) => (eventDate(o)?.getTime() ?? today) >= today)
    .sort((a, b) => (eventDate(a)?.getTime() ?? 0) - (eventDate(b)?.getTime() ?? 0));
  const next = upcoming[0];
  const days = next && eventDate(next) ? Math.max(0, Math.ceil((eventDate(next)!.getTime() - now) / 86400000)) : null;
  const pending = orders.pending[0];

  const go = (t: Tab) => {
    setTab(t);
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  };
  // Menus & services are edited in the in-page builder on My Services.
  const editServices = () => {
    go("services");
    setTimeout(() => document.getElementById(BUILDER_ID)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const signOut = async () => {
    await logout();
    window.location.href = "/";
  };
  const openNotifications = () => (pending ? setReview(pending) : flash("No new booking notifications."));

  const nav: { id: Tab; label: string; icon: IconName; count?: number; soft?: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { id: "services", label: "My Services", icon: "services", count: configured.length, soft: true },
    { id: "orders", label: "Orders", icon: "orders", count: orders.pending.length },
  ];

  const ctx: HomeCtx = {
    vendor,
    tier,
    diet,
    live,
    orders,
    upcoming,
    next,
    days,
    pending,
    services,
    galleryCount: gallery.length,
    onReview: setReview,
    onDecline: (o) => act(o, "decline"),
    onPrep: setPrep,
    go,
    flash,
  };

  return (
    <div className="flex min-h-dvh w-full bg-cream/10 text-ink">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-cream/20 bg-maroon text-cream lg:flex">
        <div className="border-b border-cream/15 px-[18px] py-[22px]">
          <Link href="/" aria-label="Bhojpatra home" className="block">
            <CreamLogo className="h-9 w-[142px]" />
          </Link>
          <span className="mt-1.5 inline-block rounded bg-ink/30 px-[7px] py-0.5 text-[9.5px] font-bold uppercase tracking-[1.5px] text-white">
            Vendor Portal
          </span>
          <div className="mt-3.5 rounded-lg border border-cream/20 bg-ink/20 px-3 py-2.5">
            <div className="truncate text-sm font-bold text-white">{name}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-cream">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-cream shadow-[0_0_0_2px_rgba(240,208,158,0.4)]" />
              {vendor?.verified ? "Active Partner" : "Pending Verification"}
            </div>
            {(diet || tier) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {diet && <span className="rounded-[3px] bg-white/20 px-1.5 py-px text-[9.5px] font-bold text-white">{diet}</span>}
                {tier && (
                  <span className="rounded-[3px] bg-cream px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.5px] text-maroon">
                    {tier} Tier
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4" aria-label="Vendor portal">
          {nav.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => go(n.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-control px-3 py-[9px] text-left text-[13.5px] transition-colors",
                  active ? "bg-cream font-bold text-maroon shadow-card" : "font-semibold text-cream/90 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon name={n.icon} />
                <span className="flex-1">{n.label}</span>
                {n.count !== undefined && (n.soft || n.count > 0) && (
                  <span
                    className={cn(
                      "rounded-full px-[7px] py-px text-[11px] font-extrabold",
                      active ? "bg-maroon text-cream" : n.soft ? "bg-cream text-maroon" : "bg-white text-maroon",
                    )}
                  >
                    {n.count}
                  </span>
                )}
              </button>
            );
          })}
          {SOON.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => flash(s.toast)}
              className="flex items-center gap-3 rounded-control px-3 py-[9px] text-left text-[13.5px] font-semibold text-cream/90 hover:bg-white/10 hover:text-white"
            >
              <Icon name={s.icon} />
              <span className="flex-1">{s.label}</span>
              <span className="rounded-[3px] bg-ink/25 px-[5px] py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-cream/80">Soon</span>
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-1.5 border-t border-cream/15 px-3 py-3.5">
          <a href="/contact" className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs font-semibold text-cream hover:bg-white/10 hover:text-white">
            <Icon name="help" size={16} />
            Partner Helpdesk
          </a>
          <button type="button" onClick={editServices} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-cream hover:bg-white/10 hover:text-white">
            <Icon name="edit" size={16} />
            Edit Menu & Services
          </button>
          <button type="button" onClick={signOut} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-cream hover:bg-white/10 hover:text-white">
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Canvas ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop topbar */}
        <header className="sticky top-0 z-20 hidden h-[60px] items-center justify-between border-b border-cream/30 bg-white/95 px-6 backdrop-blur-md lg:flex">
          <div className="flex items-center gap-2 text-[13.5px]">
            <span className="text-ink/60">Vendor Portal</span>
            <span className="text-cream">/</span>
            <span className="font-bold">{BREADCRUMB[tab]}</span>
          </div>
          <div className="flex items-center gap-3">
            <BellButton dot={orders.pending.length > 0} onClick={openNotifications} />
            <a
              href="/account/profile"
              title="Account"
              className="flex items-center gap-2 rounded-full border border-cream/30 bg-white py-[3px] pl-[5px] pr-3"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon text-[11px] font-bold text-cream">{initials}</span>
              <span className="text-[12.5px] font-semibold">{name}</span>
            </a>
          </div>
        </header>

        {/* Mobile AppBar */}
        <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-cream/30 bg-white px-3.5 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bhojpatra-logo.png" alt="Bhojpatra" className="h-6 w-auto shrink-0" />
            <span className="truncate border-l border-cream/60 pl-2.5 text-[13px] font-bold">{name}</span>
          </div>
          <BellButton dot={orders.pending.length > 0} onClick={openNotifications} bare />
        </header>

        {toast && (
          <div role="status" className="fixed left-1/2 top-4 z-[60] w-[min(92vw,420px)] -translate-x-1/2 rounded-control bg-ink px-4 py-3 text-center text-[13px] font-semibold text-white shadow-pop">
            {toast}
          </div>
        )}

        <main className="flex-1 p-3 pb-[84px] lg:p-6">
          {loading ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-maroon border-t-transparent" />
            </div>
          ) : tab === "dashboard" ? (
            <>
              <div className="hidden lg:block">
                <DesktopHome {...ctx} />
              </div>
              <div className="lg:hidden">
                <MobileHome {...ctx} />
              </div>
            </>
          ) : tab === "services" ? (
            <ServicesHub services={services} onEdit={editServices} />
          ) : (
            <OrdersPipeline orders={orders} upcoming={upcoming} onReview={setReview} onDecline={(o) => act(o, "decline")} onPrep={setPrep} />
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-[58px] items-stretch border-t border-cream/30 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Vendor portal">
        {nav.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => go(n.id)}
            aria-current={tab === n.id ? "page" : undefined}
            className={cn("relative flex flex-1 flex-col items-center justify-center gap-[3px] text-[10px] font-bold", tab === n.id ? "text-maroon" : "text-ink/60")}
          >
            <span className="relative">
              <Icon name={n.icon} size={20} />
              {n.id === "orders" && orders.pending.length > 0 && (
                <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-maroon px-1 text-[9px] font-extrabold text-white">
                  {orders.pending.length}
                </span>
              )}
            </span>
            {n.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn("flex flex-1 flex-col items-center justify-center gap-[3px] text-[10px] font-bold", moreOpen ? "text-maroon" : "text-ink/60")}
        >
          <Icon name="more" size={20} />
          More
        </button>
      </nav>

      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} onSoon={(m) => (setMoreOpen(false), flash(m))} onEdit={editServices} onSignOut={signOut} />
      <BookingReviewModal order={review} onClose={() => setReview(null)} onAccept={(o) => act(o, "accept")} onDecline={(o) => act(o, "decline")} />
      <PrepSheetModal order={prep} onClose={() => setPrep(null)} />
    </div>
  );
}

function BellButton({ dot, onClick, bare }: { dot: boolean; onClick: () => void; bare?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dot ? "New booking notification" : "Notifications"}
      className={cn(
        "relative flex items-center justify-center text-ink",
        bare ? "h-10 w-10" : "h-[38px] w-[38px] rounded-control border border-cream/30 bg-white hover:bg-cream/15",
      )}
    >
      <Icon name="bell" />
      {dot && <span className={cn("absolute h-2 w-2 rounded-full bg-maroon shadow-[0_0_0_2px_#ffffff]", bare ? "right-2 top-2" : "right-[7px] top-[7px]")} />}
    </button>
  );
}

function MoreSheet({
  open,
  onClose,
  onSoon,
  onEdit,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  onSoon: (msg: string) => void;
  onEdit: () => void;
  onSignOut: () => void;
}) {
  if (!open) return null;
  const row = "flex min-h-[48px] w-full items-center gap-3 border-b border-cream/30 px-1 text-left text-sm font-semibold text-ink";
  return (
    <Sheet open onClose={onClose} eyebrow="Vendor Portal" title="More">
      {SOON.map((s) => (
        <button key={s.label} type="button" onClick={() => onSoon(s.toast)} className={row}>
          <Icon name={s.icon} className="text-maroon" />
          <span className="flex-1">{s.label}</span>
          <span className="rounded-[3px] bg-cream/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] text-ink/70">Soon</span>
        </button>
      ))}
      <a href="/contact" className={row}>
        <Icon name="help" className="text-maroon" />
        Partner Helpdesk
      </a>
      <button type="button" onClick={onEdit} className={row}>
        <Icon name="edit" className="text-maroon" />
        Edit Menu & Services
      </button>
      <button type="button" onClick={onSignOut} className={cn(row, "border-b-0 text-maroon")}>
        Sign out
      </button>
    </Sheet>
  );
}

/* ── Services model (the 7 V2 services, in handover order) ────────────────── */
interface ServiceCard {
  key: string;
  title: string;
  configured: boolean;
  status: string;
  detail: string;
}

function buildServices(v: LiveVendorRecord | null): ServiceCard[] {
  const cats = v?.serviceCategories || [];
  const comps = v?.cateringComponents || {};
  const courses = ["welcome", "starters", "main", "breads", "sweets"];
  const dishes = (v?.menu || []).filter((s) => courses.includes(s.categoryId)).reduce((n, s) => n + s.items.length, 0);
  const tier = v?.tiers?.length ? sortTiers(v.tiers).slice(-1)[0] : "Silver";
  const stallCats = v?.stallConfig?.categories || [];
  const stallRates = Object.values(v?.stallConfig?.categoryPricing || {})
    .map((p) => p.fixedPerPlate)
    .filter((n) => n > 0);
  const counters = v?.counters || [];
  const extras = v?.customOfferings || [];

  const feast = Boolean(v && (cats.includes("full-catering") || dishes));
  const stall = Boolean(cats.includes("single-stall") || stallCats.length);
  const baina = Boolean(cats.includes("baina-box") || v?.bainaBoxes?.length);
  const hasCounters = comps.counters !== false && counters.length > 0;
  const hasExtras = Boolean(comps.extras && extras.length);
  const hasAddons = comps.addons !== false && Boolean(v?.cutleryTier);
  const hasEssentials = comps.essentials !== false && Boolean(v?.essentialService);

  return [
    { key: "feast", title: "Feast Booking", configured: feast, status: tier, detail: `${tier} (₹${(v?.priceFrom ?? 0).toLocaleString("en-IN")}/p) · ${dishes} ${dishes === 1 ? "Dish" : "Dishes"}` },
    {
      key: "stall",
      title: "Single Stall",
      configured: stall,
      status: "Active",
      detail: stallRates.length ? `Active · Fixed (₹${Math.min(...stallRates)}/p)` : `Active · ${stallCats.map(stallCategoryName).join(", ") || "No categories"}`,
    },
    { key: "baina", title: "Baina Boxes", configured: baina, status: "Active", detail: `Active · ${v?.bainaBoxes?.length ?? 0} Box Sizes` },
    { key: "counters", title: "Live Counters", configured: hasCounters, status: "Active", detail: `${counters.length} Active Counter${counters.length === 1 ? "" : "s"}` },
    { key: "extras", title: "Extras", configured: hasExtras, status: "Active", detail: `${extras.map((e) => e.title).slice(0, 2).join(" & ")} Active` },
    { key: "addons", title: "Add-ons", configured: hasAddons, status: "Active", detail: `Tableware: ${v?.cutleryTier ?? ""}` },
    { key: "essentials", title: "Essentials", configured: hasEssentials, status: "Active", detail: `${v?.essentialService?.includes.length ?? 0} Inclusions` },
  ];
}

/* ── Dashboard Home ───────────────────────────────────────────────────────── */
interface HomeCtx {
  vendor: LiveVendorRecord | null;
  tier?: string;
  diet?: string;
  live: boolean;
  orders: OrdersPayload;
  upcoming: VendorOrderSummary[];
  next?: VendorOrderSummary;
  days: number | null;
  pending?: VendorOrderSummary;
  services: ServiceCard[];
  galleryCount: number;
  onReview: (o: VendorOrderSummary) => void;
  onDecline: (o: VendorOrderSummary) => void;
  onPrep: (o: VendorOrderSummary) => void;
  go: (t: Tab) => void;
  flash: (msg: string) => void;
}

function useHomeStats({ vendor, orders, galleryCount }: Pick<HomeCtx, "vendor" | "orders" | "galleryCount">) {
  const payout = orders.confirmed.reduce((n, o) => n + Math.max(0, (o.amount || 0) - (o.paid || 0)), 0);
  const rating = vendor?.rating || vendor?.googleRating;
  const reviews = vendor?.reviews || vendor?.googleReviews || 0;
  const checklist: { done: boolean; label: string; weight: number }[] = [
    { done: Boolean(vendor?.about && vendor?.business), label: "Business bio & contact phone verified", weight: 30 },
    { done: Boolean(vendor?.verified), label: "GST & FSSAI statutory documents submitted", weight: 25 },
    { done: (vendor?.menu || []).some((s) => s.items.length), label: "V2 Feast & Service packages published", weight: 25 },
    { done: galleryCount >= 3, label: "Upload 3 kitchen gallery photos (+20%)", weight: 20 },
  ];
  const completeness = checklist.reduce((n, c) => n + (c.done ? c.weight : 0), 0);
  return { payout, rating, reviews, checklist, completeness };
}

/** Event date / time sub-line: "Dinner Service · 7:30 PM Buffet". */
function servingLine(o: VendorOrderSummary) {
  return [o.mealTime && `${o.mealTime} Service`, o.eventTime && `${time12(o.eventTime)} Buffet`].filter(Boolean).join(" · ");
}

/** Dishes the customer picked (invoice menu), each tagged veg / non-veg from the vendor's own menu. */
function menuSpread(o: VendorOrderSummary, vendor: LiveVendorRecord | null) {
  const diets = new Map<string, string>();
  for (const s of vendor?.menu || []) for (const it of s.items) diets.set(String(it.name).toLowerCase(), it.diet);
  for (const list of Object.values(vendor?.stallConfig?.menus || {})) for (const it of list) diets.set(String(it.name).toLowerCase(), it.diet);
  const dishes = (o.invoice?.menu || [])
    .flatMap((g) => g.items.split(","))
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => ({ name: d, diet: diets.get(d.toLowerCase()) }));
  const counters = (o.invoice?.lines || []).map((l) => l.label).filter((l) => /counter/i.test(l));
  return { dishes, counters };
}

function StatusPills({ live, tier, diet }: { live: boolean; tier?: string; diet?: string }) {
  return (
    <>
      <span className={cn(PILL, "border border-maroon bg-white text-maroon")}>
        <span className="h-[7px] w-[7px] rounded-full bg-maroon" />
        {live ? "Live on Marketplace" : "Pending Review"}
      </span>
      {tier && <span className={cn(PILL, "bg-maroon text-cream")}>{TIER_LABEL[tier] ?? tier}</span>}
      {diet && (
        <span className={cn(PILL, "border border-cream bg-cream/20 text-ink")}>
          <Icon name="scale" size={13} />
          {diet}
        </span>
      )}
    </>
  );
}

function DesktopHome(ctx: HomeCtx) {
  const { vendor, tier, diet, live, orders, upcoming, next, days, pending, services, onReview, onDecline, onPrep, go, flash } = ctx;
  const { payout, rating, reviews, checklist, completeness } = useHomeStats(ctx);

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Operational status banner */}
      <section className={cn(CARD, "px-[18px] py-3")}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPills live={live} tier={tier} diet={diet} />
        </div>
        <p className="mt-2 text-[12.5px] text-ink/65">
          {live
            ? `Your kitchen profile is active and discoverable for feast & stall bookings in ${vendor?.city || "your city"}.`
            : "Your profile is under express review (12–24h). You'll go live once KYC and menus are verified."}
        </p>
        <button
          type="button"
          onClick={() => flash(vendor?.verified ? "Compliance documents are verified and on record" : "Statutory profile & compliance — Coming Soon")}
          className="mt-2 text-[12.5px] font-bold text-maroon hover:underline"
        >
          Compliance Settings →
        </button>
      </section>

      {/* 2. Action required */}
      {pending && (
        <section className={cn(CARD, "flex items-center justify-between gap-4 border-l-4 border-l-maroon px-5 py-4")}>
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-maroon/10 text-maroon">
              <Icon name="alert" size={22} />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[14.5px] font-bold">
                {orders.pending.length} new booking request{orders.pending.length > 1 ? "s" : ""} require{orders.pending.length > 1 ? "" : "s"} kitchen confirmation
                <span className="rounded-full bg-maroon px-[7px] py-px text-[10.5px] font-extrabold uppercase text-cream">Action Needed in 24h</span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink/65">
                {[title(pending), fmtDate(pending), `${pending.guests} Guests`, place(pending), pkg(pending)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <button type="button" onClick={() => onReview(pending)} className="rounded-control bg-maroon px-4 py-2 text-[13px] font-bold text-cream hover:shadow-brand">
              Review Booking
            </button>
            <button type="button" onClick={() => onDecline(pending)} className="rounded-control border border-cream/60 px-3.5 py-2 text-[13px] font-semibold hover:bg-cream/15">
              Decline
            </button>
          </div>
        </section>
      )}

      {/* 3. Next upcoming event (focal point) */}
      <NextEventSpotlight next={next} days={days} vendor={vendor} onPrep={onPrep} go={go} />

      {/* 4. Metrics */}
      <section className="grid grid-cols-4 gap-4">
        {(
          [
            ["Upcoming Bookings", "event", `${upcoming.length} Event${upcoming.length === 1 ? "" : "s"}`, upcoming[0] ? `Next: ${fmtDate(upcoming[0])}` : "No events scheduled"],
            ["Completed Events", "check", `${orders.completed.length} Event${orders.completed.length === 1 ? "" : "s"}`, "Lifetime events"],
            ["Average Rating", "star", rating ? `★ ${rating}` : "★ —", reviews ? `Based on ${reviews} reviews` : "No reviews yet"],
            ["Pending Payout", "wallet", inr(payout), "Due on event completion"],
          ] as [string, IconName, string, string][]
        ).map(([label, icon, value, sub]) => (
          <div key={label} className={cn(CARD, "flex flex-col gap-1 p-[18px]")}>
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.5px] text-ink/55">
              <span>{label}</span>
              <Icon name={icon} size={16} />
            </div>
            <div className="mt-1 text-2xl font-extrabold">{value}</div>
            <div className="mt-0.5 text-[11.5px] text-ink/60">{sub}</div>
          </div>
        ))}
      </section>

      {/* 5. Bottom split */}
      <section className="grid grid-cols-[1.6fr_1fr] items-start gap-5">
        <div className={cn(CARD, "flex flex-col gap-4 p-5")}>
          <PanelHeader title="Active Booking Pipeline" action="View Orders & Archives →" onAction={() => go("orders")} />
          <BookingList list={upcoming.slice(0, 5)} onOpen={onPrep} />
        </div>

        <div className="flex flex-col gap-4">
          <div className={cn(CARD, "flex flex-col gap-2.5 p-[18px]")}>
            <PanelHeader title="Services & Catalog Health" action={`Manage (${services.length}) →`} onAction={() => go("services")} />
            {services.map((s, i) => (
              <div key={s.key} className="flex items-center justify-between gap-3 border-b border-cream/20 pb-[7px] text-[12.5px] last:border-b-0 last:pb-0">
                <span className="shrink-0">
                  {i + 1}. {s.title}
                </span>
                <strong className={cn("truncate text-right", !s.configured ? "font-semibold text-ink/50" : s.key === "feast" ? "text-maroon" : "text-ink")}>
                  {s.configured ? s.detail : "Not Configured · Add +"}
                </strong>
              </div>
            ))}
          </div>

          <div className={cn(CARD, "flex flex-col gap-2.5 p-[18px]")}>
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-base font-extrabold">Profile Completeness</h2>
              <strong className="text-sm text-maroon">{completeness}%</strong>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-cream/30">
              <div className="h-full rounded-full bg-maroon" style={{ width: `${completeness}%` }} />
            </div>
            <ul className="mt-1.5 flex flex-col gap-[7px] text-xs">
              {checklist.map((c) => (
                <li key={c.label} className={cn("flex items-center gap-2", !c.done && "text-ink/55")}>
                  {c.done ? <span className="font-extrabold text-maroon">✓</span> : <span>○</span>}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-sans text-base font-extrabold">{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="shrink-0 text-[12.5px] font-bold text-maroon hover:underline">
          {action}
        </button>
      )}
    </div>
  );
}

function NextEventSpotlight({
  next,
  days,
  vendor,
  onPrep,
  go,
}: {
  next?: VendorOrderSummary;
  days: number | null;
  vendor: LiveVendorRecord | null;
  onPrep: (o: VendorOrderSummary) => void;
  go: (t: Tab) => void;
}) {
  const shell = "relative flex flex-col gap-[18px] overflow-hidden rounded-hero border border-cream bg-white p-6 shadow-card";
  const bar = <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-maroon to-cream" aria-hidden />;
  const eyebrow = (
    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[1.2px] text-maroon">
      <Icon name="star" size={12} />
      Next Upcoming Event Commitment
    </div>
  );
  if (!next) {
    return (
      <section className={shell}>
        {bar}
        <div>
          {eyebrow}
          <p className="text-sm text-ink/60">No confirmed events yet. New booking requests will appear here.</p>
        </div>
      </section>
    );
  }
  const { dishes, counters } = menuSpread(next, vendor);
  const shown = dishes.slice(0, 5);
  const logistics: [IconName, string, string, string][] = [
    ["event", "Event Date & Time", fmtLong(next), servingLine(next)],
    ["pin", "Serving Venue", next.venue || next.city, next.venue ? next.city : ""],
    ["people", "Headcount & Format", `${next.guests} Guests Confirmed`, pkg(next)],
  ];
  return (
    <section className={shell}>
      {bar}
      <div className="flex items-start justify-between gap-4">
        <div>
          {eyebrow}
          <h1 className="font-sans text-[22px] font-extrabold leading-tight">{title(next)}</h1>
        </div>
        {days !== null && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-maroon/10 px-3 py-[5px] text-xs font-extrabold text-maroon">
            <Icon name="clock" size={14} />
            {days === 0 ? "Next Event Today" : `Next Event in ${days} Day${days === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-card border border-cream/30 bg-cream/10 p-4">
        {logistics.map(([icon, label, value, sub]) => (
          <div key={label} className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cream/30 bg-white text-maroon">
              <Icon name={icon} />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-[0.5px] text-ink/55">{label}</div>
              <div className="mt-0.5 text-sm font-bold">{value}</div>
              {sub && <div className="mt-px text-[11.5px] text-ink/60">{sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {(dishes.length > 0 || counters.length > 0) && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-[0.5px] text-ink/65">Itemized Menu Spread Assigned to Your Kitchen:</div>
          <div className="flex flex-wrap gap-2">
            {shown.map((d) => (
              <span key={d.name} className="inline-flex items-center gap-1.5 rounded-md border border-cream/30 bg-white px-2.5 py-[5px] text-xs text-ink/80">
                {d.diet && <span className={cn("h-2 w-2 rounded-full", d.diet === "non-veg" ? "bg-maroon" : "bg-ink")} />}
                {d.name}
              </span>
            ))}
            {dishes.length > shown.length && (
              <span className="inline-flex items-center rounded-md border border-cream/30 bg-cream/30 px-2.5 py-[5px] text-xs font-bold text-ink/80">
                +{dishes.length - shown.length} More Dishes
              </span>
            )}
            {counters.map((c) => (
              <span key={c} className="inline-flex items-center rounded-md border border-maroon bg-white px-2.5 py-[5px] text-xs font-bold text-maroon">
                + {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {next.note && (
        <div className="flex items-start gap-2 rounded-md border-l-[3px] border-l-maroon bg-cream/20 px-3.5 py-2.5 text-[12.5px] text-ink/80">
          <Icon name="note" size={16} className="mt-px" />
          <div>
            <strong>Host Special Instructions:</strong> &ldquo;{next.note}&rdquo;
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 border-t border-cream/30 pt-2">
        <button type="button" onClick={() => go("orders")} className="rounded-control border border-cream/60 px-3.5 py-2 text-[13px] font-semibold hover:bg-cream/15">
          View All Orders
        </button>
        <button
          type="button"
          onClick={() => onPrep(next)}
          className="inline-flex items-center gap-2 rounded-control bg-maroon px-[18px] py-[9px] text-[13px] font-bold text-cream shadow-brand hover:-translate-y-px"
        >
          <Icon name="print" size={16} />
          View Kitchen Prep Sheet
        </button>
      </div>
    </section>
  );
}

function MobileHome(ctx: HomeCtx) {
  const { tier, diet, live, orders, upcoming, next, days, pending, onReview, onPrep } = ctx;
  const { payout, rating, reviews } = useHomeStats(ctx);
  const line = "flex items-start gap-1.5";

  return (
    <div className="flex flex-col gap-3">
      {/* Status strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cream/30 bg-white px-2.5 py-2 text-[11px] font-bold">
        <span className="flex items-center gap-1 text-maroon">
          <span className="h-[7px] w-[7px] rounded-full bg-maroon" />
          {live ? "Live on Bhojpatra" : "Pending Review"}
        </span>
        {diet && (
          <span className="flex items-center gap-1">
            <Icon name="scale" size={12} />
            {diet}
          </span>
        )}
        {tier && <span className="rounded-[3px] bg-cream px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.5px] text-maroon">{tier}</span>}
      </div>

      {/* Urgent alert */}
      {pending && (
        <div className="flex flex-col gap-2 rounded-[10px] border border-l-[3.5px] border-cream/30 border-l-maroon bg-white p-3">
          <div className="flex items-center gap-1.5 text-[13px] font-extrabold">
            <Icon name="alert" className="text-maroon" />
            {orders.pending.length} Booking Request{orders.pending.length > 1 ? "s" : ""} Pending
          </div>
          <p className="text-[11.5px] leading-snug text-ink/65">
            {[title(pending), fmtDate(pending, { day: "numeric", month: "short" }), `${pending.guests} Guests`, pending.city].filter(Boolean).join(" · ")}
          </p>
          <button type="button" onClick={() => onReview(pending)} className="w-full rounded-control bg-maroon py-2.5 text-[13px] font-bold text-cream">
            Review Booking (Action Needed)
          </button>
        </div>
      )}

      {/* Spotlight */}
      <div className="flex flex-col gap-2.5 rounded-[14px] border border-cream bg-white p-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-maroon">Next Commitment</span>
          {next && days !== null && (
            <span className="rounded-full bg-maroon/10 px-2 py-[3px] text-[10.5px] font-extrabold text-maroon">{days === 0 ? "Today" : `In ${days} Day${days === 1 ? "" : "s"}`}</span>
          )}
        </div>
        {next ? (
          <>
            <div className="text-base font-extrabold leading-snug">{title(next)}</div>
            <div className="flex flex-col gap-[5px] text-[12.5px] text-ink/80">
              <div className={line}>
                <Icon name="event" size={15} className="mt-px text-maroon" />
                <span>
                  <strong>{fmtLong(next)}</strong>
                  {next.eventTime ? ` (${time12(next.eventTime)})` : next.mealTime ? ` (${next.mealTime})` : ""}
                </span>
              </div>
              <div className={line}>
                <Icon name="pin" size={15} className="mt-px text-maroon" />
                <span>
                  <strong>{next.venue || next.city}</strong>
                  {next.venue ? `, ${next.city}` : ""}
                </span>
              </div>
              <div className={line}>
                <Icon name="people" size={15} className="mt-px text-maroon" />
                <span>
                  <strong>{next.guests} Guests</strong>
                  {pkg(next) ? ` (${pkg(next)})` : ""}
                </span>
              </div>
            </div>
            {next.note && (
              <div className="rounded-md bg-cream/20 px-2.5 py-2 text-[11.5px]">
                <strong>Special:</strong> {next.note}
              </div>
            )}
            <button
              type="button"
              onClick={() => onPrep(next)}
              className="flex w-full items-center justify-center gap-2 rounded-control bg-maroon py-2.5 text-[13px] font-bold text-cream shadow-brand"
            >
              <Icon name="print" size={15} />
              View Kitchen Prep Sheet
            </button>
          </>
        ) : (
          <p className="text-[12.5px] text-ink/60">No confirmed events yet. New booking requests will appear here.</p>
        )}
      </div>

      {/* Metrics 2×2 */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["Active Orders", String(upcoming.length), upcoming[0] ? `Next: ${fmtDate(upcoming[0], { day: "numeric", month: "short" })}` : "None scheduled", false],
            ["Pending Payout", inrCompact(payout), "Due upon serving", true],
            ["Rating", rating ? `★ ${rating}` : "★ —", reviews ? `${reviews} reviews` : "No reviews yet", false],
            ["Completed", String(orders.completed.length), "Lifetime events", false],
          ] as [string, string, string, boolean][]
        ).map(([label, value, sub, red]) => (
          <div key={label} className="flex flex-col gap-0.5 rounded-lg border border-cream/30 bg-white p-2.5">
            <div className="text-[10.5px] font-semibold uppercase text-ink/55">{label}</div>
            <div className={cn("text-lg font-extrabold", red && "text-maroon")}>{value}</div>
            <div className="text-[10px] text-ink/55">{sub}</div>
          </div>
        ))}
      </div>

      {/* Upcoming schedule */}
      <div className="rounded-card border border-cream/30 bg-white p-3.5">
        <div className="mb-2 text-[13.5px] font-extrabold">Upcoming Schedule</div>
        {upcoming.length ? (
          <ul className="flex flex-col gap-2">
            {upcoming.slice(0, 5).map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onPrep(o)}
                  className="flex w-full items-center justify-between gap-2 border-b border-cream/20 pb-1.5 text-left text-xs"
                >
                  <span className="min-w-0 truncate">
                    <strong>{fmtDate(o, { day: "numeric", month: "short" })}</strong> · {o.occasion} ({o.guests}p)
                  </span>
                  <span className="shrink-0 rounded-[3px] bg-maroon px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.5px] text-cream">Confirmed</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink/55">No confirmed bookings yet.</p>
        )}
      </div>
    </div>
  );
}

function BookingList({ list, onOpen }: { list: VendorOrderSummary[]; onOpen?: (o: VendorOrderSummary) => void }) {
  if (!list.length) return <p className="text-sm text-ink/55">No confirmed bookings yet.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {list.map((o) => (
        <li key={o.id}>
          <button
            type="button"
            onClick={() => onOpen?.(o)}
            className="flex w-full items-center justify-between gap-3 rounded-control border border-cream/30 bg-cream/10 px-3.5 py-3 text-left transition-colors hover:border-cream hover:bg-white hover:shadow-card"
          >
            <span className="min-w-12 rounded-lg border border-cream bg-white px-2 py-1.5 text-center">
              <span className="block text-[17px] font-extrabold leading-none text-maroon">{fmtDate(o, { day: "numeric" })}</span>
              <span className="block text-[10px] font-bold uppercase">{fmtDate(o, { month: "short" })}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-bold">{title(o)}</span>
              <span className="mt-0.5 block text-[11.5px] text-ink/60">{[place(o), `${o.guests} Guests`, pkg(o)].filter(Boolean).join(" · ")}</span>
            </span>
            <span className={cn(PILL, "shrink-0 bg-maroon text-cream")}>Confirmed</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── My Services ──────────────────────────────────────────────────────────── */
const BUILDER_ID = "vendor-menu-builder";

function ServicesHub({ services, onEdit }: { services: ServiceCard[]; onEdit: () => void }) {
  const active = services.filter((s) => s.configured).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-xl font-extrabold">My Services & Offerings ({services.length} Independent Services)</h1>
          <p className="mt-0.5 text-[12.5px] text-ink/60">
            Your live offerings. Edit dishes, counters and Baina boxes in the menu builder below — changes go to admin review before they appear to customers.
          </p>
        </div>
        <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center justify-center rounded-control bg-maroon px-4 py-2 text-[13px] font-bold text-cream">
          + Add / Configure Services
        </button>
      </div>
      <p className="text-xs font-semibold text-ink/60">
        {active} of {services.length} services active
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {services.map((s) => (
          <button key={s.key} type="button" onClick={onEdit} className={cn(CARD, "p-4 text-left hover:border-maroon/40")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[14px] font-bold">{s.title}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", s.configured ? "bg-maroon text-cream" : "bg-cream/40 text-ink/70")}>
                {s.configured ? "Active Service" : "Not Configured"}
              </span>
            </div>
            <p className="mt-1 text-xs text-ink/60">{s.configured ? s.detail : "Add this service in the builder."}</p>
            <span className="mt-2 inline-block text-xs font-bold text-maroon">{s.configured ? "Edit in builder →" : "Add +"}</span>
          </button>
        ))}
      </div>
      <div id={BUILDER_ID} className="flex scroll-mt-20 flex-col gap-4">
        <BainaBoxSpecial variant="dashboard" />
        <MenuBuilder />
      </div>
    </div>
  );
}

/* ── Orders ───────────────────────────────────────────────────────────────── */
function OrdersPipeline({
  orders,
  upcoming,
  onReview,
  onDecline,
  onPrep,
}: {
  orders: OrdersPayload;
  upcoming: VendorOrderSummary[];
  onReview: (o: VendorOrderSummary) => void;
  onDecline: (o: VendorOrderSummary) => void;
  onPrep: (o: VendorOrderSummary) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-xl font-extrabold">Orders & Booking Pipeline</h1>
          <p className="mt-0.5 text-[12.5px] text-ink/60">
            Review incoming booking requests, manage event commitments, and access kitchen production sheets.
          </p>
        </div>
        {upcoming[0] && (
          <button type="button" onClick={() => onPrep(upcoming[0])} className="inline-flex shrink-0 items-center justify-center rounded-control bg-maroon px-4 py-2 text-[13px] font-bold text-cream">
            Open Next Event Prep Sheet
          </button>
        )}
      </div>
      {orders.pending.map((o) => (
        <div key={o.id} className={cn(CARD, "border-l-4 border-l-maroon p-4")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold">Incoming: {title(o)}</span>
            <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase text-cream">Awaiting Confirmation</span>
          </div>
          <p className="mt-1 text-xs text-ink/65">
            {fmtDate(o)}
            {o.mealTime ? ` (${o.mealTime})` : ""} · {o.guests} Guests · {place(o)}
            {pkg(o) ? ` · ${pkg(o)}` : ""} · {inr(o.amount)}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => onReview(o)} className="rounded-control bg-maroon px-4 py-2 text-[13px] font-bold text-cream">
              Review Request
            </button>
            <button type="button" onClick={() => onDecline(o)} className="rounded-control border border-cream/60 px-3.5 py-2 text-[13px] font-semibold">
              Decline
            </button>
          </div>
        </div>
      ))}
      <div className={cn(CARD, "flex flex-col gap-4 p-5")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-base font-extrabold">Confirmed Event Orders ({upcoming.length})</h2>
          <span className="text-[11px] text-ink/55">Sorted chronologically</span>
        </div>
        <BookingList list={upcoming} onOpen={onPrep} />
      </div>
    </div>
  );
}

/* ── Modals ───────────────────────────────────────────────────────────────── */
function BookingReviewModal({
  order,
  onClose,
  onAccept,
  onDecline,
}: {
  order: VendorOrderSummary | null;
  onClose: () => void;
  onAccept: (o: VendorOrderSummary) => void;
  onDecline: (o: VendorOrderSummary) => void;
}) {
  if (!order) return null;
  const row = (icon: IconName, children: ReactNode) => (
    <li className="flex items-start gap-2">
      <Icon name={icon} size={16} className="mt-0.5 text-maroon" />
      <span>{children}</span>
    </li>
  );
  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow="Incoming Booking Request"
      title={`Review Order: ${order.id}`}
      footer={
        <>
          <BtnBack onClick={() => onDecline(order)}>Decline (Busy / Unavailable)</BtnBack>
          <BtnNext onClick={() => onAccept(order)}>Accept & Confirm Capacity</BtnNext>
        </>
      }
    >
      <span className={cn(PILL, "border border-maroon bg-white text-maroon")}>Awaiting Acceptance</span>
      <ul className="mt-3 space-y-1.5 text-sm">
        {row("event", <>Date: {fmtDate(order)}{order.mealTime ? ` (${order.mealTime})` : ""}</>)}
        {row(
          "people",
          <>
            Guest Count: {order.guests} Guests
            {order.vegGuests != null || order.nonVegGuests != null ? ` (Veg ${order.vegGuests ?? 0} · Non-Veg ${order.nonVegGuests ?? 0})` : ""}
          </>,
        )}
        {row("pin", <>Venue: {place(order)}</>)}
        {order.service && row("services", <>Package: {order.service.name} ({inr(order.service.price)}/plate)</>)}
        {row("wallet", <>Estimated Catering Total: {inr(order.amount)}</>)}
      </ul>
      <p className="mt-4 rounded-control bg-cream/20 p-3 text-xs text-ink/80">
        <strong>Capacity Confirmation:</strong> Acknowledging confirms that your kitchen has adequate ingredient inventory,
        chefs, and service crew to cater this event on {fmtDate(order, { day: "numeric", month: "short" })}. Once accepted,
        the customer is notified.
      </p>
    </Sheet>
  );
}

function PrepSheetModal({ order, onClose }: { order: VendorOrderSummary | null; onClose: () => void }) {
  if (!order) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      eyebrow="Kitchen Production Brief"
      title={`Chef Prep Sheet: ${order.occasion}`}
      wide
      footer={
        <>
          <BtnBack onClick={() => window.print()}>Print A4 Kitchen Sheet</BtnBack>
          <BtnNext onClick={onClose}>Done</BtnNext>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-control bg-cream/15 p-2.5">Order ID: <strong>{order.id}</strong></div>
        <div className="rounded-control bg-cream/15 p-2.5">
          Event Date: <strong>{fmtDate(order)}{order.mealTime ? ` (${order.mealTime})` : ""}</strong>
        </div>
        <div className="rounded-control bg-cream/15 p-2.5">
          Plating Deadline: <strong>{order.eventTime ? time12(order.eventTime) : "—"}</strong>
        </div>
        <div className="rounded-control bg-cream/15 p-2.5">
          <strong>{order.guests} Guests</strong>
          {order.vegGuests != null ? ` · Veg ${order.vegGuests}` : ""}
          {order.nonVegGuests != null ? ` · Non-Veg ${order.nonVegGuests}` : ""}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink/80">Venue: {place(order)}</p>
      {pkg(order) && <p className="mt-1 text-xs text-ink/80">Package: {pkg(order)}</p>}
      {(order.invoice?.menu || []).length > 0 && (
        <div className="mt-3 space-y-1.5 text-xs">
          {order.invoice!.menu.map((g) => (
            <p key={g.heading}>
              <strong>{g.heading}:</strong> {g.items}
            </p>
          ))}
        </div>
      )}
      {order.note && (
        <p className="mt-3 rounded-control border border-cream bg-cream/10 p-3 text-xs text-ink/80">
          <strong>Host Special Instructions:</strong> {order.note}
        </p>
      )}
    </Sheet>
  );
}
