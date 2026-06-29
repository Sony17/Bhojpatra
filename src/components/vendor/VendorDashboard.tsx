"use client";

import { useMemo, useState } from "react";
import {
  vendorStats,
  vendorBookingRequests,
  vendorEarnings,
  vendorCalendarEvents,
  vendorNotifications,
  type BookingRequest,
  type RequestStatus,
  type EarningRow,
  type VendorNotification,
} from "@/lib/data";
import { useLang } from "@/lib/i18n";

const inr = new Intl.NumberFormat("en-IN");
const money = (n: number) => `₹${inr.format(n)}`;

type Tab =
  | "overview"
  | "requests"
  | "calendar"
  | "earnings"
  | "profile"
  | "notifications";

const TABS: { id: Tab; en: string; hi: string }[] = [
  { id: "overview", en: "Overview", hi: "अवलोकन" },
  { id: "requests", en: "Booking Requests", hi: "बुकिंग अनुरोध" },
  { id: "calendar", en: "Order Calendar", hi: "ऑर्डर कैलेंडर" },
  { id: "earnings", en: "Earnings", hi: "कमाई" },
  { id: "profile", en: "Profile", hi: "प्रोफ़ाइल" },
  { id: "notifications", en: "Notifications", hi: "सूचनाएं" },
];

interface VendorProfile {
  businessName: string;
  owner: string;
  phone: string;
  email: string;
  city: string;
  about: string;
  basePlatePrice: string;
}

const INITIAL_PROFILE: VendorProfile = {
  businessName: "Awadhi Royal Caterers",
  owner: "Imtiaz Ahmed",
  phone: "+91 98765 43210",
  email: "hello@awadhiroyal.in",
  city: "Lucknow",
  about:
    "Three generations of authentic Awadhi & Mughlai dum cuisine. FSSAI-certified kitchens, live dum biryani counters and bespoke wedding menus for 50–2000 guests.",
  basePlatePrice: "1349",
};

export default function VendorDashboard() {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("overview");
  const [requests, setRequests] = useState<BookingRequest[]>([
    ...vendorBookingRequests,
  ]);
  const [notifications, setNotifications] = useState<VendorNotification[]>([
    ...vendorNotifications,
  ]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const setRequestStatus = (id: string, status: RequestStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <DashboardHeader unreadCount={unreadCount} onBell={() => setTab("notifications")} />

      {/* Tab bar */}
      <div className="mt-8 flex flex-wrap gap-2.5">
        {TABS.map((tab_) => {
          const active = tab === tab_.id;
          const showBadge = tab_.id === "notifications" && unreadCount > 0;
          return (
            <button
              key={tab_.id}
              type="button"
              onClick={() => setTab(tab_.id)}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "bg-maroon text-cream"
                  : "bg-cream-2 text-ink-soft hover:bg-cream-3")
              }
            >
              {t(tab_.en, tab_.hi)}
              {showBadge && (
                <span
                  className={
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold " +
                    (active ? "bg-cream text-maroon" : "bg-maroon text-cream")
                  }
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {tab === "overview" && (
          <OverviewPanel requests={requests} onSeeAll={() => setTab("requests")} />
        )}
        {tab === "requests" && (
          <RequestsPanel requests={requests} onSetStatus={setRequestStatus} />
        )}
        {tab === "calendar" && <CalendarPanel />}
        {tab === "earnings" && <EarningsPanel />}
        {tab === "profile" && <ProfilePanel />}
        {tab === "notifications" && (
          <NotificationsPanel
            notifications={notifications}
            onMarkAllRead={markAllRead}
          />
        )}
      </div>
    </section>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function DashboardHeader({
  unreadCount,
  onBell,
}: {
  unreadCount: number;
  onBell: () => void;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="eyebrow text-sm font-medium text-gold">
          {t("Vendor Dashboard", "वेंडर डैशबोर्ड")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-ink sm:text-3xl">
            Awadhi Royal Caterers
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
            <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-cream-3 bg-cream-2 px-3 py-1 text-xs font-semibold text-ink">
            <span aria-hidden="true" className="text-gold">
              ◆
            </span>{" "}
            {t("Platinum", "प्लैटिनम")}
          </span>
        </div>
        <p className="font-script mt-2 text-lg text-ink-soft">
          {t(
            "Welcome back — here's what's cooking today.",
            "वापसी पर स्वागत है — आज क्या पक रहा है, यहाँ देखें।",
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={onBell}
        aria-label={t(
          `Notifications, ${unreadCount} unread`,
          `सूचनाएं, ${unreadCount} अपठित`,
        )}
        className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full border border-cream-3 bg-cream-2 text-lg text-ink transition hover:bg-cream-3 sm:self-auto"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon px-1 text-xs font-semibold text-cream">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────────────────── */

function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { t } = useLang();
  if (status === "Accepted") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
        <span aria-hidden="true">✓</span> {t("Accepted", "स्वीकृत")}
      </span>
    );
  }
  if (status === "Declined") {
    return (
      <span className="inline-flex items-center rounded-full bg-cream-2 px-3 py-1 text-xs font-semibold text-ink-soft">
        {t("Declined", "अस्वीकृत")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-maroon px-3 py-1 text-xs font-semibold text-maroon">
      {t("New", "नया")}
    </span>
  );
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function OverviewPanel({
  requests,
  onSeeAll,
}: {
  requests: BookingRequest[];
  onSeeAll: () => void;
}) {
  const { t } = useLang();
  const recent = requests.slice(0, 3);

  const total = vendorEarnings.reduce((s, e) => s + e.amount, 0);
  const settled = vendorEarnings
    .filter((e) => e.status === "Settled")
    .reduce((s, e) => s + e.amount, 0);
  const pending = vendorEarnings
    .filter((e) => e.status === "Pending")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {vendorStats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-xl">
              <span aria-hidden="true">{stat.icon}</span>
            </span>
            <p className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{stat.label}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent requests */}
        <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              {t("Recent Requests", "हाल के अनुरोध")}
            </h2>
            <button
              type="button"
              onClick={onSeeAll}
              className="text-sm font-semibold text-maroon hover:underline"
            >
              {t("See all", "सभी देखें")}
            </button>
          </div>
          <ul className="mt-4 divide-y divide-cream-3">
            {recent.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.customer}</p>
                  <p className="text-sm text-ink-soft">
                    {r.occasion} · {r.guests} {t("pax", "मेहमान")} · {r.city}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-display text-sm font-semibold text-maroon">
                    {money(r.estValue)}
                  </span>
                  <RequestStatusBadge status={r.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Mini earnings summary */}
        <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("Earnings Summary", "कमाई का सारांश")}
          </h2>
          <dl className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-ink-soft">{t("Total", "कुल")}</dt>
              <dd className="font-display text-xl font-bold text-ink">
                {money(total)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-cream-3 pt-3">
              <dt className="text-sm text-ink-soft">{t("Settled", "निपटाया गया")}</dt>
              <dd className="font-semibold text-ink">{money(settled)}</dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-sm text-ink-soft">{t("Pending", "पेंडिंग")}</dt>
              <dd className="font-semibold text-maroon">{money(pending)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

/* ── Booking Requests ───────────────────────────────────────────────────── */

const REQUEST_FILTERS: ("All" | RequestStatus)[] = [
  "All",
  "New",
  "Accepted",
  "Declined",
];

function RequestsPanel({
  requests,
  onSetStatus,
}: {
  requests: BookingRequest[];
  onSetStatus: (id: string, status: RequestStatus) => void;
}) {
  const { t } = useLang();
  const [filter, setFilter] = useState<"All" | RequestStatus>("All");

  const filterLabel = (f: "All" | RequestStatus) =>
    f === "All"
      ? t("All", "सभी")
      : f === "New"
        ? t("New", "नया")
        : f === "Accepted"
          ? t("Accepted", "स्वीकृत")
          : t("Declined", "अस्वीकृत");

  const visible = useMemo(
    () =>
      filter === "All"
        ? requests
        : requests.filter((r) => r.status === filter),
    [requests, filter],
  );

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2.5">
        {REQUEST_FILTERS.map((f) => {
          const active = filter === f;
          const count =
            f === "All"
              ? requests.length
              : requests.filter((r) => r.status === f).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={active}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "bg-maroon text-cream"
                  : "bg-cream-2 text-ink-soft hover:bg-cream-3")
              }
            >
              {filterLabel(f)} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-3 bg-white/60 p-12 text-center">
          <p className="font-display text-lg text-ink">
            {t("No requests here", "यहाँ कोई अनुरोध नहीं")}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {t("Try a different filter.", "कोई दूसरा फ़िल्टर आज़माएं।")}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {r.customer}
                    </h3>
                    <RequestStatusBadge status={r.status} />
                    <span className="text-xs text-ink-soft">{r.id}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    {r.occasion} · {r.date} · {r.guests} {t("guests", "मेहमान")} ·{" "}
                    {r.city}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {t("Estimated value:", "अनुमानित मूल्य:")}{" "}
                    <span className="font-display font-semibold text-maroon">
                      {money(r.estValue)}
                    </span>
                  </p>
                </div>

                {r.status === "New" && (
                  <div className="flex w-full gap-2.5 sm:w-auto sm:shrink-0">
                    <button
                      type="button"
                      onClick={() => onSetStatus(r.id, "Accepted")}
                      className="flex-1 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:flex-none"
                    >
                      {t("Accept", "स्वीकारें")}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetStatus(r.id, "Declined")}
                      className="flex-1 rounded-full border border-cream-3 px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-cream-2 sm:flex-none"
                    >
                      {t("Decline", "अस्वीकारें")}
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Order Calendar (July 2026) ─────────────────────────────────────────── */

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

function CalendarPanel() {
  const { t, lang } = useLang();
  const weekdays = lang === "hi" ? WEEKDAYS_HI : WEEKDAYS_EN;
  const year = 2026; // July 2026 (calendar is fixed to this month)
  const daysInMonth = 31;
  // July 1 2026 is a Wednesday → index 3 (Sun=0).
  const firstWeekday = 3;

  const eventsByDay = useMemo(() => {
    const map = new Map<number, string>();
    for (const ev of vendorCalendarEvents) {
      const [, , d] = ev.date.split("-");
      map.set(Number(d), ev.label);
    }
    return map;
  }, []);

  // Build leading blanks + day cells.
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("July", "जुलाई")} {year}
        </h2>
        <p className="font-script mt-1 text-base text-ink-soft">
          {t(
            "Your confirmed events at a glance.",
            "आपके पुष्ट इवेंट एक नज़र में।",
          )}
        </p>

        <div className="mt-5 grid grid-cols-7 gap-0.5 text-center sm:gap-1.5">
          {weekdays.map((w) => (
            <div
              key={w}
              className="py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft"
            >
              {w}
            </div>
          ))}

          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`blank-${i}`} className="aspect-square" />;
            }
            const label = eventsByDay.get(day);
            const hasEvent = label !== undefined;
            return (
              <div
                key={day}
                title={label}
                className={
                  "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-sm " +
                  (hasEvent
                    ? "border-maroon bg-maroon-soft font-semibold text-maroon"
                    : "border-cream-3 bg-cream/40 text-ink")
                }
              >
                <span>{day}</span>
                {hasEvent && (
                  <>
                    <span
                      aria-hidden="true"
                      className="mt-1 h-1.5 w-1.5 rounded-full bg-maroon"
                    />
                    <span className="mt-0.5 hidden truncate px-1 text-[8px] font-medium leading-tight text-maroon sm:block sm:text-[10px]">
                      {label}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <h3 className="font-display text-base font-semibold text-ink">
          {t("Confirmed Events", "पुष्ट इवेंट")}
        </h3>
        <ul className="mt-3 space-y-2">
          {vendorCalendarEvents
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((ev) => {
              const [, , d] = ev.date.split("-");
              return (
                <li
                  key={ev.date}
                  className="flex items-center gap-3 text-sm text-ink"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full bg-maroon"
                  />
                  <span className="font-semibold text-maroon">
                    {Number(d)} {t("Jul", "जुल")}
                  </span>
                  <span className="text-ink-soft">{ev.label}</span>
                </li>
              );
            })}
        </ul>
      </div>
    </div>
  );
}

/* ── Earnings ───────────────────────────────────────────────────────────── */

function EarningStatusBadge({ status }: { status: EarningRow["status"] }) {
  const { t } = useLang();
  const styles: Record<EarningRow["status"], string> = {
    Settled: "bg-maroon text-cream",
    "Advance Received": "border border-maroon text-maroon",
    Pending: "bg-cream-2 text-ink-soft",
  };
  const label: Record<EarningRow["status"], string> = {
    Settled: t("Settled", "निपटाया गया"),
    "Advance Received": t("Advance Received", "अग्रिम प्राप्त"),
    Pending: t("Pending", "पेंडिंग"),
  };
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
        styles[status]
      }
    >
      {label[status]}
    </span>
  );
}

function EarningsPanel() {
  const { t } = useLang();
  const total = vendorEarnings.reduce((s, e) => s + e.amount, 0);
  const settled = vendorEarnings
    .filter((e) => e.status === "Settled")
    .reduce((s, e) => s + e.amount, 0);
  const pending = vendorEarnings
    .filter((e) => e.status !== "Settled")
    .reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary band */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          {
            label: t("Total Earnings", "कुल कमाई"),
            value: total,
            accent: "text-ink",
          },
          { label: t("Settled", "निपटाया गया"), value: settled, accent: "text-ink" },
          {
            label: t("Pending / In-flight", "लंबित / प्रक्रियाधीन"),
            value: pending,
            accent: "text-maroon",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-ink-soft">{c.label}</p>
            <p className={"mt-2 font-display text-2xl font-bold " + c.accent}>
              {money(c.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm">
        <div className="hidden grid-cols-12 gap-3 border-b border-cream-3 bg-cream-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid">
          <span className="col-span-5">{t("Event", "इवेंट")}</span>
          <span className="col-span-3">{t("Date", "तारीख")}</span>
          <span className="col-span-2 text-right">{t("Amount", "राशि")}</span>
          <span className="col-span-2 text-right">{t("Status", "स्थिति")}</span>
        </div>
        <ul className="divide-y divide-cream-3">
          {vendorEarnings.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-2 gap-2 px-3 py-4 sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-5"
            >
              <div className="col-span-2 sm:col-span-5">
                <p className="font-medium text-ink">{e.event}</p>
                <p className="text-xs text-ink-soft">{e.id}</p>
              </div>
              <span className="text-sm text-ink-soft sm:col-span-3">
                {e.date}
              </span>
              <span className="font-display font-semibold text-ink sm:col-span-2 sm:text-right">
                {money(e.amount)}
              </span>
              <span className="justify-self-start sm:col-span-2 sm:justify-self-end">
                <EarningStatusBadge status={e.status} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Profile ────────────────────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-lg border border-cream-3 bg-cream/40 px-3.5 py-2.5 text-ink outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30";

function ProfilePanel() {
  const { t } = useLang();
  const [profile, setProfile] = useState<VendorProfile>(INITIAL_PROFILE);
  const [saved, setSaved] = useState<boolean>(false);

  const update = <K extends keyof VendorProfile>(
    key: K,
    value: VendorProfile[K],
  ) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(true);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6"
    >
      <h2 className="font-display text-lg font-semibold text-ink">
        {t("Profile Management", "प्रोफ़ाइल प्रबंधन")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t(
          "Keep your business details current. You can also edit your menus, per-plate pricing and gallery photos from here.",
          "अपने बिज़नेस विवरण अद्यतन रखें। आप यहाँ से अपने मेन्यू, प्रति-प्लेट मूल्य और गैलरी फ़ोटो भी संपादित कर सकते हैं।",
        )}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={t("Business Name", "बिज़नेस का नाम")}>
          <input
            type="text"
            value={profile.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("Owner Name", "मालिक का नाम")}>
          <input
            type="text"
            value={profile.owner}
            onChange={(e) => update("owner", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("Phone", "फ़ोन")}>
          <input
            type="tel"
            value={profile.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("Email", "ईमेल")}>
          <input
            type="email"
            value={profile.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("City", "शहर")}>
          <input
            type="text"
            value={profile.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("Base Price (₹ / plate)", "आधार मूल्य (₹ / प्लेट)")}>
          <input
            type="number"
            min={0}
            value={profile.basePlatePrice}
            onChange={(e) => update("basePlatePrice", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t("About / Description", "विवरण / परिचय")}>
            <textarea
              rows={4}
              value={profile.about}
              onChange={(e) => update("about", e.target.value)}
              className={inputClass + " resize-y"}
            />
          </Field>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Save Changes", "बदलाव सहेजें")}
        </button>
        {saved && (
          <span
            role="status"
            className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
          >
            <span aria-hidden="true" className="text-maroon">
              ✓
            </span>{" "}
            {t("Profile updated", "प्रोफ़ाइल अपडेट हो गई")}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

/* ── Notifications ──────────────────────────────────────────────────────── */

function NotificationsPanel({
  notifications,
  onMarkAllRead,
}: {
  notifications: VendorNotification[];
  onMarkAllRead: () => void;
}) {
  const { t } = useLang();
  const hasUnread = notifications.some((n) => n.unread);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("Notifications", "सूचनाएं")}
          </h2>
          <p className="text-sm text-ink-soft">
            {t(
              "Real-time alerts — also sent to you over WhatsApp & email.",
              "रीयल-टाइम अलर्ट — व्हाट्सएप और ईमेल पर भी भेजे जाते हैं।",
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onMarkAllRead}
          disabled={!hasUnread}
          className="rounded-full border border-maroon px-5 py-2.5 text-sm font-semibold text-maroon transition hover:bg-maroon/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("Mark all read", "सभी पढ़े हुए चिह्नित करें")}
        </button>
      </div>

      <ul className="space-y-3">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={
              "flex items-start gap-3 rounded-2xl border border-cream-3 bg-white p-4 shadow-sm " +
              (n.unread ? "border-l-4 border-l-maroon" : "")
            }
          >
            <span
              aria-hidden="true"
              className={
                "mt-1.5 h-2 w-2 shrink-0 rounded-full " +
                (n.unread ? "bg-maroon" : "bg-cream-3")
              }
            />
            <div className="min-w-0">
              <p className={n.unread ? "font-medium text-ink" : "text-ink"}>
                {n.message}
              </p>
              <p className="mt-0.5 text-xs text-ink-soft">{n.time}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
