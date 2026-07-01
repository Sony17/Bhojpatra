"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import {
  addPartnerRole,
  partnerMemberships,
  useSession,
  type PartnerRole,
} from "@/lib/session";
import {
  makeReferralCode,
  PARTNER_ROLE_LABEL,
  referralLink,
  referralPayoutHref,
} from "@/lib/referral";
import type { BookingStatus } from "@/lib/data";
import VenuePanel from "@/components/partner/VenuePanel";

/** All partner roles, in display order — used to offer the ones not yet held. */
const ALL_ROLES: PartnerRole[] = ["planner", "individual", "venue"];

/** Short emoji marker per role, mirroring the signup picker. */
const ROLE_ICON: Record<PartnerRole, string> = {
  planner: "📋",
  individual: "🙋",
  venue: "🏛️",
};

const inr = new Intl.NumberFormat("en-IN");
const money = (n: number) => `₹${inr.format(n)}`;

/** Referred order shape, as returned by GET /api/bookings. */
interface ReferredOrder {
  id: string;
  customer: string;
  occasion: string;
  date: string;
  guests: number;
  vendor: string;
  city: string;
  amount: number;
  paid: number;
  status: BookingStatus;
  referralCode?: string;
  referrerName?: string;
  referrerType?: string;
}

type Tab = "overview" | "share" | "referrals" | "venues";

const TABS: { id: Tab; en: string; hi: string }[] = [
  { id: "overview", en: "Overview", hi: "अवलोकन" },
  { id: "share", en: "Share & Earn", hi: "शेयर करें और कमाएं" },
  { id: "referrals", en: "My Referrals", hi: "मेरे रेफ़रल" },
];

/** The "My Venue" tab is only meaningful for the Venue-Owner role. */
const VENUE_TAB: { id: Tab; en: string; hi: string } = {
  id: "venues",
  en: "My Venue",
  hi: "मेरा वेन्यू",
};

export default function PartnerDashboard() {
  const { t } = useLang();
  const session = useSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<ReferredOrder[]>([]);
  // Which role's dashboard is on screen (null → default to the first held).
  const [activeType, setActiveType] = useState<PartnerRole | null>(null);
  // The role currently being registered, while its referral code is minted.
  const [adding, setAdding] = useState<PartnerRole | null>(null);

  // Every role this account holds; one person can be all three at once. Each
  // role carries its own referral code, so each gets its own dashboard view.
  const memberships = partnerMemberships(session);
  const active =
    memberships.find((m) => m.type === activeType) ?? memberships[0] ?? null;
  const code = active?.referralCode ?? "";
  const partnerLabel = active
    ? PARTNER_ROLE_LABEL[active.type]
    : t("Partner", "पार्टनर");
  const addable = ALL_ROLES.filter(
    (r) => !memberships.some((m) => m.type === r),
  );

  function selectRole(type: PartnerRole) {
    setActiveType(type);
    setTab("overview");
  }

  // Register an extra partner role on this account: mint a fresh code, persist
  // the partner record (so the booking wizard + admin can resolve it), attach
  // the role to the session, then switch the dashboard to it.
  async function addRole(type: PartnerRole) {
    if (adding) return;
    setAdding(type);
    const newCode = makeReferralCode(session?.name);
    try {
      await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode, name: session?.name ?? "", type }),
      });
    } catch {
      /* offline — the session still records the role; team follows up */
    }
    addPartnerRole({ type, referralCode: newCode });
    setActiveType(type);
    setTab("overview");
    setAdding(null);
  }

  // Pull every recorded order, then keep only the ones booked with this
  // partner's referral code. The booking wizard tags orders at confirm time.
  useEffect(() => {
    if (!code) return;
    let active = true;
    fetch("/api/bookings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const all = (data?.orders ?? []) as ReferredOrder[];
        setOrders(all.filter((o) => o.referralCode === code));
      })
      .catch(() => {
        /* offline — show the empty state */
      });
    return () => {
      active = false;
    };
  }, [code]);

  const confirmed = orders.filter(
    (o) => o.status === "Confirmed" || o.status === "Completed",
  );
  const referredValue = orders.reduce((s, o) => s + o.amount, 0);

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <DashboardHeader name={session?.name} role={partnerLabel} />

      {/* Role switcher — one dashboard per partner role this person holds. */}
      <RoleSwitcher
        memberships={memberships}
        addable={addable}
        activeType={active?.type ?? null}
        adding={adding}
        onSelect={selectRole}
        onAdd={addRole}
      />

      {/* Tab bar — the Venue-Owner role gets an extra "My Venue" tab where it
          publishes the venues it lists, books and gets paid for. */}
      <div className="mt-8 flex flex-wrap gap-2.5">
        {(active?.type === "venue" ? [...TABS, VENUE_TAB] : TABS).map((tb) => {
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "bg-maroon text-cream"
                  : "bg-cream-2 text-ink-soft hover:bg-cream-3")
              }
            >
              {t(tb.en, tb.hi)}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {tab === "overview" && (
          <OverviewPanel
            code={code}
            total={orders.length}
            confirmed={confirmed.length}
            referredValue={referredValue}
            onShare={() => setTab("share")}
            onSeeAll={() => setTab("referrals")}
            recent={orders.slice(0, 3)}
          />
        )}
        {tab === "share" && (
          <SharePanel code={code} name={session?.name} />
        )}
        {tab === "referrals" && <ReferralsPanel orders={orders} />}
        {tab === "venues" && active?.type === "venue" && (
          <VenuePanel code={code} name={session?.name} />
        )}
      </div>
    </section>
  );
}

/* ── Role switcher ──────────────────────────────────────────────────────── */

function RoleSwitcher({
  memberships,
  addable,
  activeType,
  adding,
  onSelect,
  onAdd,
}: {
  memberships: { type: PartnerRole; referralCode: string }[];
  addable: PartnerRole[];
  activeType: PartnerRole | null;
  adding: PartnerRole | null;
  onSelect: (type: PartnerRole) => void;
  onAdd: (type: PartnerRole) => void;
}) {
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  // One role and nothing left to add → no switcher needed.
  if (memberships.length <= 1 && addable.length === 0) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {t("Your partner roles", "आपकी पार्टनर भूमिकाएँ")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2.5">
        {memberships.map((m) => {
          const active = m.type === activeType;
          return (
            <button
              key={m.type}
              type="button"
              onClick={() => onSelect(m.type)}
              aria-pressed={active}
              className={
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
                (active
                  ? "border-maroon bg-maroon text-cream"
                  : "border-cream-3 bg-white text-ink-soft hover:border-maroon/40 hover:bg-cream-2")
              }
            >
              <span aria-hidden="true">{ROLE_ICON[m.type]}</span>
              {PARTNER_ROLE_LABEL[m.type]}
            </button>
          );
        })}

        {/* Add another role this person doesn't hold yet. */}
        {addable.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={adding !== null}
              className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-maroon px-4 py-2 text-sm font-semibold text-maroon transition-colors hover:bg-maroon/5 disabled:opacity-50"
            >
              <span aria-hidden="true">＋</span>
              {adding
                ? t("Adding…", "जोड़ रहे हैं…")
                : t("Add role", "भूमिका जोड़ें")}
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute left-0 z-10 mt-2 w-56 overflow-hidden rounded-xl border border-cream-3 bg-white p-1 shadow-md"
              >
                {addable.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onAdd(r);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-cream-2"
                  >
                    <span aria-hidden="true">{ROLE_ICON[r]}</span>
                    {PARTNER_ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function DashboardHeader({ name, role }: { name?: string; role: string }) {
  const { t } = useLang();
  return (
    <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
      <p className="eyebrow text-sm font-medium text-gold">
        {t("Partner Dashboard", "पार्टनर डैशबोर्ड")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">
          {name || t("Welcome", "स्वागत है")}
        </h1>
        <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
          <span aria-hidden="true">★</span> {role}
        </span>
      </div>
      <p className="font-script mt-2 text-lg text-ink-soft">
        {t(
          "Refer feasts, track bookings, settle your earnings.",
          "भोज रेफ़र करें, बुकिंग ट्रैक करें, अपनी कमाई पाएं।",
        )}
      </p>
    </div>
  );
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function OverviewPanel({
  code,
  total,
  confirmed,
  referredValue,
  onShare,
  onSeeAll,
  recent,
}: {
  code: string;
  total: number;
  confirmed: number;
  referredValue: number;
  onShare: () => void;
  onSeeAll: () => void;
  recent: ReferredOrder[];
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const copyCode = () => {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  };
  const stats = [
    {
      label: t("Referrals", "रेफ़रल"),
      value: String(total),
      sub: t("feasts booked with your code", "आपके कोड से बुक भोज"),
      icon: "🎟️",
    },
    {
      label: t("Confirmed", "पुष्ट"),
      value: String(confirmed),
      sub: t("confirmed or completed", "पुष्ट या पूर्ण"),
      icon: "✓",
    },
    {
      label: t("Referred Value", "रेफ़र मूल्य"),
      value: money(referredValue),
      sub: t("total booking value", "कुल बुकिंग मूल्य"),
      icon: "₹",
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
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
        {/* Recent referrals */}
        <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              {t("Recent Referrals", "हाल के रेफ़रल")}
            </h2>
            {recent.length > 0 && (
              <button
                type="button"
                onClick={onSeeAll}
                className="text-sm font-semibold text-maroon hover:underline"
              >
                {t("See all", "सभी देखें")}
              </button>
            )}
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              {t(
                "No referrals yet. Share your link to get started.",
                "अभी कोई रेफ़रल नहीं। शुरू करने के लिए अपना लिंक साझा करें।",
              )}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-cream-3">
              {recent.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{o.customer}</p>
                    <p className="text-sm text-ink-soft">
                      {o.occasion} · {o.guests} {t("pax", "मेहमान")} · {o.city}
                    </p>
                  </div>
                  <span className="font-display shrink-0 text-sm font-semibold text-maroon">
                    {money(o.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Share card */}
        <div className="flex flex-col rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("Your Referral Code", "आपका रेफ़रल कोड")}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-maroon/30 bg-cream px-4 py-3">
            <span className="font-display text-2xl font-bold tracking-wider text-maroon">
              {code || "—"}
            </span>
            <button
              type="button"
              onClick={copyCode}
              disabled={!code}
              className="shrink-0 rounded-full border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition hover:bg-maroon/5 disabled:opacity-50"
            >
              {copied ? t("Copied!", "कॉपी हुआ!") : t("Copy", "कॉपी करें")}
            </button>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {t(
              "Share your link — every feast booked with it is credited to you.",
              "अपना लिंक साझा करें — इससे बुक हर भोज आपके खाते में जुड़ेगा।",
            )}
          </p>
          <button
            type="button"
            onClick={onShare}
            className="mt-auto w-full rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
          >
            {t("Share & Earn", "शेयर करें और कमाएं")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Share & Earn ───────────────────────────────────────────────────────── */

function SharePanel({ code, name }: { code: string; name?: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = code ? referralLink(code) : "";

  const copy = (text: string, what: "code" | "link") => {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(
      () => {
        setCopied(what);
        window.setTimeout(() => setCopied(null), 1800);
      },
      () => {},
    );
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("Share your referral", "अपना रेफ़रल साझा करें")}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Send this link to anyone planning a feast. When they book with it, the order is tagged to you.",
            "भोज प्लान करने वाले किसी को यह लिंक भेजें। जब वे इससे बुक करेंगे, ऑर्डर आपके नाम टैग होगा।",
          )}
        </p>

        {/* Code */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("Referral code", "रेफ़रल कोड")}
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <span className="font-display rounded-lg border border-maroon/30 bg-cream px-4 py-2 text-xl font-bold tracking-wider text-maroon">
              {code || "—"}
            </span>
            <button
              type="button"
              onClick={() => copy(code, "code")}
              className="rounded-full border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
            >
              {copied === "code" ? t("Copied!", "कॉपी हुआ!") : t("Copy code", "कोड कॉपी करें")}
            </button>
          </div>
        </div>

        {/* Link */}
        <div className="mt-5">
          <label className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            {t("Share link", "शेयर लिंक")}
          </label>
          <div className="mt-1.5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              readOnly
              value={link}
              className="w-full rounded-lg border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none sm:flex-1"
            />
            <button
              type="button"
              onClick={() => copy(link, "link")}
              className="shrink-0 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
            >
              {copied === "link" ? t("Copied!", "कॉपी हुआ!") : t("Copy link", "लिंक कॉपी करें")}
            </button>
          </div>
        </div>
      </div>

      {/* Settlement — earnings are reconciled with the Bhojpatra team. */}
      <div className="rounded-2xl border border-maroon/30 bg-maroon-soft/30 p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("Settle your earnings", "अपनी कमाई पाएं")}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Your commission is calculated on confirmed bookings. Connect with the Bhojpatra team on WhatsApp to settle your payout.",
            "आपका कमीशन पुष्ट बुकिंग पर तय होता है। अपना भुगतान पाने के लिए WhatsApp पर Bhojpatra टीम से जुड़ें।",
          )}
        </p>
        <a
          href={referralPayoutHref(code || "—", name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          <span aria-hidden="true">💬</span>
          {t("Connect with Bhojpatra", "Bhojpatra से जुड़ें")}
        </a>
      </div>
    </div>
  );
}

/* ── My Referrals ───────────────────────────────────────────────────────── */

function ReferralStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useLang();
  const styles: Record<BookingStatus, string> = {
    Confirmed: "bg-maroon text-cream",
    Completed: "bg-maroon text-cream",
    Pending: "border border-maroon text-maroon",
    Cancelled: "bg-cream-2 text-ink-soft",
  };
  const label: Record<BookingStatus, string> = {
    Confirmed: t("Confirmed", "पुष्ट"),
    Completed: t("Completed", "पूर्ण"),
    Pending: t("Pending", "पेंडिंग"),
    Cancelled: t("Cancelled", "रद्द"),
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

function ReferralsPanel({ orders }: { orders: ReferredOrder[] }) {
  const { t } = useLang();
  const total = useMemo(() => orders.reduce((s, o) => s + o.amount, 0), [orders]);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-cream-3 bg-white/60 p-12 text-center">
        <p className="font-display text-lg text-ink">
          {t("No referrals yet", "अभी कोई रेफ़रल नहीं")}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Share your link or code — referred bookings show up here.",
            "अपना लिंक या कोड साझा करें — रेफ़र की गई बुकिंग यहाँ दिखेंगी।",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-ink-soft">
          {t("Total referred value", "कुल रेफ़र मूल्य")}
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-maroon">
          {money(total)}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cream-3 bg-white shadow-sm">
        <div className="hidden grid-cols-12 gap-3 border-b border-cream-3 bg-cream-2 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-soft sm:grid">
          <span className="col-span-4">{t("Customer", "ग्राहक")}</span>
          <span className="col-span-3">{t("Occasion", "अवसर")}</span>
          <span className="col-span-2">{t("Date", "तारीख")}</span>
          <span className="col-span-2 text-right">{t("Value", "मूल्य")}</span>
          <span className="col-span-1 text-right">{t("Status", "स्थिति")}</span>
        </div>
        <ul className="divide-y divide-cream-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="grid grid-cols-2 gap-2 px-3 py-4 sm:grid-cols-12 sm:items-center sm:gap-3 sm:px-5"
            >
              <div className="col-span-2 sm:col-span-4">
                <p className="font-medium text-ink">{o.customer}</p>
                <p className="text-xs text-ink-soft">{o.id}</p>
              </div>
              <span className="text-sm text-ink-soft sm:col-span-3">
                {o.occasion} · {o.city}
              </span>
              <span className="text-sm text-ink-soft sm:col-span-2">
                {o.date}
              </span>
              <span className="font-display font-semibold text-ink sm:col-span-2 sm:text-right">
                {money(o.amount)}
              </span>
              <span className="justify-self-start sm:col-span-1 sm:justify-self-end">
                <ReferralStatusBadge status={o.status} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
