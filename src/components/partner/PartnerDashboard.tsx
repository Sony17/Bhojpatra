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
import {
  DEFAULT_REFERRAL_RATES,
  referrerPercentFor,
  type ReferralRates,
} from "@/lib/referralRates";
import type { BookingStatus } from "@/lib/data";
import VenuePanel from "@/components/partner/VenuePanel";
import { Badge, AppBar, Button, Card, EmptyState, type BadgeTone } from "@/components/ui";
import { money } from "@/lib/money";

/** All partner roles, in display order — used to offer the ones not yet held. */
const ALL_ROLES: PartnerRole[] = ["planner", "individual", "venue"];

/** Short emoji marker per role, mirroring the signup picker. */
const ROLE_ICON: Record<PartnerRole, string> = {
  planner: "📋",
  individual: "🙋",
  venue: "🏛️",
};

/**
 * Completed referred bookings a partner must reach before they become a
 * Verified Bhojpatra Partner and their payout unlocks. Applies to every partner
 * role. Only fully "Completed" orders count — Pending/Confirmed/Cancelled don't.
 */
const VERIFY_THRESHOLD = 3;

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
  // `null` = no explicit choice yet, so the active tab defaults per role —
  // venue owners land on "My Venue", referrers on "Overview".
  const [tab, setTab] = useState<Tab | null>(null);
  const [orders, setOrders] = useState<ReferredOrder[]>([]);
  const [rates, setRates] = useState<ReferralRates>(DEFAULT_REFERRAL_RATES);
  // Which role's dashboard is on screen (null → default to the first held).
  const [activeType, setActiveType] = useState<PartnerRole | null>(null);
  // The role currently being registered, while its referral code is minted.
  const [adding, setAdding] = useState<PartnerRole | null>(null);

  // Deep-link support: /partner/dashboard?tab=venues (used by the venue-owner
  // onboarding CTAs) opens straight on the "My Venue" tab and auto-selects the
  // Venue-Owner role. Read after mount so SSR and first client render match; the
  // state persists as the session's memberships resolve, so the venue tab
  // appears the moment the role loads.
  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "venues") {
      setActiveType("venue");
      setTab("venues");
    } else if (
      tabParam === "share" ||
      tabParam === "referrals" ||
      tabParam === "overview"
    ) {
      setTab(tabParam);
    }
  }, []);

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
    setTab(null); // let the newly selected role pick its default tab
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
    await addPartnerRole({ type, referralCode: newCode });
    setActiveType(type);
    setTab(null); // land on the new role's default tab (venue → My Venue)
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

  // Live referral rates, so the reward figure reflects the admin's settings.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/referral-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReferralRates | null) => {
        if (active && d) setRates(d);
      })
      .catch(() => {
        /* offline — reward stays at the default (0) */
      });
    return () => {
      active = false;
    };
  }, []);

  const confirmed = orders.filter(
    (o) => o.status === "Confirmed" || o.status === "Completed",
  );
  const referredValue = orders.reduce((s, o) => s + o.amount, 0);

  // Admin-set referral rates → this partner's estimated reward: their type's
  // configured % of confirmed referred value. 0 until an admin sets a rate.
  const rewardPercent = referrerPercentFor(rates, active?.type);
  const confirmedValue = confirmed.reduce((s, o) => s + o.amount, 0);
  const reward = Math.round((confirmedValue * rewardPercent) / 100);

  // Verification gate: a referrer unlocks payouts once 3 referred feasts are
  // actually Completed. Until then they're "Pending Verification" and the
  // earnings figure stays visible but the settlement button is disabled.
  // Referrer-only — venue owners are paid on their venue's bookings and are
  // never gated, so none of the verification UI applies to them.
  const completedCount = orders.filter((o) => o.status === "Completed").length;
  const verified = completedCount >= VERIFY_THRESHOLD;

  // ── Payout summary ──────────────────────────────────────────────────────
  // Split referred earnings by settlement stage. Event Planners / Individual
  // Referrers earn a % of confirmed value; a Venue Owner is paid on the bookings
  // their venue generates, so their earning basis is that booking value (they
  // carry no referral %). Confirmed events are still accruing ("active payout");
  // Completed events are payable now ("due").
  const isVenue = active?.type === "venue";
  const earningsOf = (list: ReferredOrder[]) => {
    const value = list.reduce((s, o) => s + o.amount, 0);
    return isVenue ? value : Math.round((value * rewardPercent) / 100);
  };
  const completedOrders = orders.filter((o) => o.status === "Completed");
  const activePayout = earningsOf(orders.filter((o) => o.status === "Confirmed"));
  const dueAmount = earningsOf(completedOrders);
  const totalEarning = activePayout + dueAmount;
  // Due date: the instant-payout window settles a couple of days after the most
  // recent completed event. Derived from booking dates (Date.parse is pure), so
  // it needs no clock during render and can't mismatch SSR hydration. No due
  // amount (or unparseable dates) → no date to show.
  const dueDate = (() => {
    if (dueAmount <= 0) return "—";
    const times = completedOrders
      .map((o) => Date.parse(o.date))
      .filter((n) => !Number.isNaN(n));
    if (times.length === 0) return "—";
    return new Date(Math.max(...times) + 2 * 86_400_000).toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "short", year: "numeric" },
    );
  })();
  const roleIcon = active ? ROLE_ICON[active.type] : "★";

  // Venue owners get a venue-first dashboard: "My Venue" leads and the
  // referral-only tabs (Share & Earn / My Referrals) drop away, so the venue
  // function reads as its own thing rather than a referral sidecar. Overview
  // stays — it already frames payouts + bookings for the venue.
  const visibleTabs = isVenue ? [VENUE_TAB, TABS[0]] : TABS;
  const effectiveTab: Tab = tab ?? (isVenue ? "venues" : "overview");
  // Guard against a stale choice after a role switch (e.g. "share" carried over
  // to the venue role, which no longer offers that tab).
  const activeTab: Tab = visibleTabs.some((tb) => tb.id === effectiveTab)
    ? effectiveTab
    : visibleTabs[0].id;

  return (
    <>
      <AppBar
        title={
          isVenue
            ? t("Venue Dashboard", "वेन्यू डैशबोर्ड")
            : t("Partner Dashboard", "पार्टनर डैशबोर्ड")
        }
        backHref="/"
        className="lg:hidden"
      />
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-5 sm:py-12 lg:py-16">
      <DashboardHeader
        name={session?.name}
        role={partnerLabel}
        roleIcon={roleIcon}
        verified={verified}
        isVenue={isVenue}
      />

      {/* Verification gate — payouts unlock after 3 completed referred feasts.
          Referrer roles only; venue owners never see it. */}
      {active && !isVenue && (
        <VerificationBanner
          verified={verified}
          completed={completedCount}
          threshold={VERIFY_THRESHOLD}
        />
      )}

      {/* Role switcher — one dashboard per partner role this person holds. */}
      <RoleSwitcher
        memberships={memberships}
        addable={addable}
        activeType={active?.type ?? null}
        adding={adding}
        onSelect={selectRole}
        onAdd={addRole}
      />

      {/* Tab bar — a Venue Owner leads with "My Venue" and only sees venue-
          relevant tabs; referrers keep the referral tabs. */}
      <div className="mt-8 flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
        {visibleTabs.map((tb) => {
          const isActive = activeTab === tb.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              aria-pressed={isActive}
              className={
                "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors " +
                (isActive
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
        {activeTab === "overview" && (
          <OverviewPanel
            code={code}
            name={session?.name}
            total={orders.length}
            confirmed={confirmed.length}
            referredValue={referredValue}
            roleType={active?.type ?? null}
            roleLabel={partnerLabel}
            roleIcon={roleIcon}
            verified={isVenue || verified}
            payout={{
              total: totalEarning,
              active: activePayout,
              due: dueAmount,
              dueDate,
            }}
            onShare={() => setTab("share")}
            onSeeAll={() => setTab("referrals")}
            onManageVenues={() => setTab("venues")}
            recent={orders.slice(0, 3)}
          />
        )}
        {activeTab === "share" && (
          <SharePanel
            code={code}
            name={session?.name}
            reward={reward}
            rewardPercent={rewardPercent}
            verified={verified}
            completed={completedCount}
            threshold={VERIFY_THRESHOLD}
          />
        )}
        {activeTab === "referrals" && <ReferralsPanel orders={orders} />}
        {activeTab === "venues" && (
          <VenuePanel code={code} name={session?.name} />
        )}
      </div>
    </section>
    </>
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
                className="absolute left-0 z-10 mt-2 w-56 overflow-hidden rounded-card border border-cream-3 bg-white p-1 shadow-pop"
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
                    className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-cream-2"
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

function DashboardHeader({
  name,
  role,
  roleIcon,
  verified,
  isVenue,
}: {
  name?: string;
  role: string;
  roleIcon: string;
  verified: boolean;
  isVenue: boolean;
}) {
  const { t } = useLang();
  return (
    <Card padding="none" className="p-5 sm:p-6">
      <p className="eyebrow text-sm font-medium text-gold">
        {isVenue
          ? t("Venue Dashboard", "वेन्यू डैशबोर्ड")
          : t("Partner Dashboard", "पार्टनर डैशबोर्ड")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">
          {name || t("Welcome", "स्वागत है")}
        </h1>
        <Badge tone="solid">
          <span aria-hidden="true">{roleIcon}</span> {role}
        </Badge>
        {!isVenue && <VerifyBadge verified={verified} />}
      </div>
      <p className="font-script mt-2 text-lg text-ink-soft">
        {isVenue
          ? t(
              "List your venues, track their bookings, settle your earnings.",
              "अपने वेन्यू लिस्ट करें, उनकी बुकिंग ट्रैक करें, अपनी कमाई पाएं।",
            )
          : t(
              "Refer feasts, track bookings, settle your earnings.",
              "भोज रेफ़र करें, बुकिंग ट्रैक करें, अपनी कमाई पाएं।",
            )}
      </p>
    </Card>
  );
}

/* ── Verification gate ──────────────────────────────────────────────────── */

/** Pending / Verified status pill. Cream check on maroon — never a green tick. */
function VerifyBadge({ verified }: { verified: boolean }) {
  const { t } = useLang();
  return verified ? (
    <Badge tone="solid">
      <span aria-hidden="true">✓</span>{" "}
      {t("Verified Bhojpatra Partner", "सत्यापित Bhojpatra पार्टनर")}
    </Badge>
  ) : (
    <Badge tone="outline">
      {t("Pending Verification", "सत्यापन लंबित")}
    </Badge>
  );
}

/**
 * The two dashboard states from the partner onboarding flow: a progress banner
 * counting completed bookings toward the threshold, or an "active" confirmation
 * once the partner is verified.
 */
function VerificationBanner({
  verified,
  completed,
  threshold,
}: {
  verified: boolean;
  completed: number;
  threshold: number;
}) {
  const { t } = useLang();

  if (verified) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-card border border-maroon/30 bg-maroon-soft/30 p-5 sm:p-6">
        <VerifyBadge verified />
        <p className="text-sm font-medium text-ink">
          {t(
            "Your payout dashboard is now active.",
            "आपका पेआउट डैशबोर्ड अब सक्रिय है।",
          )}
        </p>
      </div>
    );
  }

  const done = Math.min(completed, threshold);
  const pct = Math.round((done / threshold) * 100);
  return (
    <div className="mt-6 rounded-card border border-cream-3 bg-cream/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <VerifyBadge verified={false} />
        <span className="text-sm font-medium text-ink-soft">
          {t(
            `${done}/${threshold} Bookings Completed`,
            `${done}/${threshold} बुकिंग पूर्ण`,
          )}
        </span>
      </div>
      <p className="mt-3 text-sm text-ink">
        {t(
          `Complete ${threshold} bookings to activate payouts.`,
          `पेआउट सक्रिय करने के लिए ${threshold} बुकिंग पूरी करें।`,
        )}
      </p>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-cream-2"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={threshold}
      >
        <div
          className="h-full rounded-full bg-maroon transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Overview ───────────────────────────────────────────────────────────── */

function OverviewPanel({
  code,
  name,
  total,
  confirmed,
  referredValue,
  roleType,
  roleLabel,
  roleIcon,
  verified,
  payout,
  onShare,
  onSeeAll,
  onManageVenues,
  recent,
}: {
  code: string;
  name?: string;
  total: number;
  confirmed: number;
  referredValue: number;
  roleType: PartnerRole | null;
  roleLabel: string;
  roleIcon: string;
  verified: boolean;
  payout: { total: number; active: number; due: number; dueDate: string };
  onShare: () => void;
  onSeeAll: () => void;
  onManageVenues: () => void;
  recent: ReferredOrder[];
}) {
  const { t } = useLang();
  const isVenue = roleType === "venue";
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
      label: isVenue ? t("Bookings", "बुकिंग") : t("Referrals", "रेफ़रल"),
      value: String(total),
      sub: isVenue
        ? t("feasts booked at your venue", "आपके वेन्यू पर बुक भोज")
        : t("feasts booked with your code", "आपके कोड से बुक भोज"),
      icon: isVenue ? "🏛️" : "🎟️",
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

  // The four payout figures Bhojpatra partners track. "Due amount" carries the
  // maroon accent as the number they act on; the rest stay ink.
  const payoutStats = [
    { label: t("Total earning", "कुल कमाई"), value: money(payout.total), accent: false },
    { label: t("Active payout", "सक्रिय भुगतान"), value: money(payout.active), accent: false },
    { label: t("Due amount", "बकाया राशि"), value: money(payout.due), accent: true },
    { label: t("Due date", "भुगतान तिथि"), value: payout.dueDate, accent: false },
  ];

  const payoutPitch =
    roleType === "venue"
      ? t(
          "Send your venue bookings through Bhojpatra and get instant payout partner benefits.",
          "अपनी वेन्यू बुकिंग Bhojpatra से भेजें और तुरंत भुगतान पार्टनर लाभ पाएं।",
        )
      : t(
          "Pass your client bookings to Bhojpatra and get instant payout partner benefits.",
          "अपनी क्लाइंट बुकिंग Bhojpatra को भेजें और तुरंत भुगतान पार्टनर लाभ पाएं।",
        );

  return (
    <div className="space-y-8">
      {/* Payout summary — the instant-payout promise with this partner's own
          numbers. Settlement stays gated on verification, matching Share & Earn. */}
      <div className="rounded-card border border-maroon/30 bg-maroon-soft/30 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[0.7rem] font-semibold text-maroon">
              {t("Instant Payouts", "तुरंत भुगतान")}
            </p>
            <h2 className="font-display mt-1 text-lg font-semibold text-ink sm:text-xl">
              {t("Your payouts", "आपके भुगतान")}
            </h2>
          </div>
          <Badge tone="solid">
            <span aria-hidden="true">{roleIcon}</span> {roleLabel}
          </Badge>
        </div>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">{payoutPitch}</p>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {payoutStats.map((m) => (
            <div
              key={m.label}
              className="rounded-control border border-maroon/15 bg-white p-3.5"
            >
              <dt className="text-xs text-ink-soft">{m.label}</dt>
              <dd
                className={
                  "font-display mt-1 text-xl font-bold sm:text-2xl " +
                  (m.accent ? "text-maroon" : "text-ink")
                }
              >
                {m.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="primary"
            href={referralPayoutHref(code || "—", name)}
            disabled={!verified}
            target="_blank"
            rel="noopener noreferrer"
            leftIcon={<span aria-hidden="true">💬</span>}
            className="w-full sm:w-auto"
          >
            {verified
              ? t("Settle payout", "भुगतान पाएं")
              : t("Payouts locked", "पेआउट लॉक")}
          </Button>
          <p className="text-xs text-ink-soft">
            {!verified
              ? t(
                  "Payouts unlock once you're a Verified Bhojpatra Partner.",
                  "पेआउट तब अनलॉक होगा जब आप सत्यापित Bhojpatra पार्टनर बनेंगे।",
                )
              : payout.due > 0
                ? t(
                    `Your due amount settles by ${payout.dueDate} — connect to withdraw instantly.`,
                    `आपकी बकाया राशि ${payout.dueDate} तक सेटल होगी — तुरंत निकालने के लिए जुड़ें।`,
                  )
                : t(
                    "Confirmed bookings become payable the moment your event completes.",
                    "इवेंट पूरा होते ही पुष्ट बुकिंग भुगतान-योग्य हो जाती है।",
                  )}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-xl">
              <span aria-hidden="true">{stat.icon}</span>
            </span>
            <p className="mt-4 font-display text-2xl font-bold text-ink sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{stat.label}</p>
            <p className="mt-0.5 text-xs text-ink-soft">{stat.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent referrals */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">
              {isVenue
                ? t("Recent bookings", "हाल की बुकिंग")
                : t("Recent Referrals", "हाल के रेफ़रल")}
            </h2>
            {recent.length > 0 && !isVenue && (
              <Button variant="ghost" size="sm" onClick={onSeeAll}>
                {t("See all", "सभी देखें")}
              </Button>
            )}
          </div>
          {recent.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 bg-cream/40 py-6 shadow-none"
              title={
                isVenue
                  ? t("No bookings yet", "अभी कोई बुकिंग नहीं")
                  : t("No referrals yet", "अभी कोई रेफ़रल नहीं")
              }
              message={
                isVenue
                  ? t(
                      "List a venue — its bookings show up here.",
                      "एक वेन्यू लिस्ट करें — उसकी बुकिंग यहाँ दिखेंगी।",
                    )
                  : t(
                      "Share your link to get started.",
                      "शुरू करने के लिए अपना लिंक साझा करें।",
                    )
              }
              action={
                isVenue ? (
                  <Button variant="primary" size="sm" onClick={onManageVenues}>
                    {t("Add a venue", "वेन्यू जोड़ें")}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={onShare}>
                    {t("Share & Earn", "शेयर करें और कमाएं")}
                  </Button>
                )
              }
            />
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
        </Card>

        {/* Share card */}
        <Card className="flex flex-col">
          <h2 className="font-display text-lg font-semibold text-ink">
            {isVenue
              ? t("Your venue code", "आपका वेन्यू कोड")
              : t("Your Referral Code", "आपका रेफ़रल कोड")}
          </h2>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-control border border-maroon/30 bg-cream px-4 py-3">
            <span className="font-display text-2xl font-bold tracking-wider text-maroon">
              {code || "—"}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={copyCode}
              disabled={!code}
              className="shrink-0"
            >
              {copied ? t("Copied!", "कॉपी हुआ!") : t("Copy", "कॉपी करें")}
            </Button>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {isVenue
              ? t(
                  "Bookings made for your venue are automatically credited to this code.",
                  "आपके वेन्यू के लिए की गई बुकिंग अपने-आप इस कोड में जुड़ जाती है।",
                )
              : t(
                  "Share your link — every feast booked with it is credited to you.",
                  "अपना लिंक साझा करें — इससे बुक हर भोज आपके खाते में जुड़ेगा।",
                )}
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={isVenue ? onManageVenues : onShare}
            className="mt-auto"
          >
            {isVenue
              ? t("Manage venues", "वेन्यू प्रबंधित करें")
              : t("Share & Earn", "शेयर करें और कमाएं")}
          </Button>
        </Card>
      </div>
    </div>
  );
}

/* ── Share & Earn ───────────────────────────────────────────────────────── */

function SharePanel({
  code,
  name,
  reward,
  rewardPercent,
  verified,
  completed,
  threshold,
}: {
  code: string;
  name?: string;
  reward: number;
  rewardPercent: number;
  verified: boolean;
  completed: number;
  threshold: number;
}) {
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
      <Card padding="none" className="p-5 sm:p-6">
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
          <div className="mt-1.5 flex flex-nowrap items-center gap-3 overflow-x-auto no-scrollbar md:flex-wrap md:overflow-visible">
            <span className="font-display shrink-0 whitespace-nowrap rounded-control border border-maroon/30 bg-cream px-4 py-2 text-xl font-bold tracking-wider text-maroon">
              {code || "—"}
            </span>
            <Button variant="secondary" size="sm" onClick={() => copy(code, "code")} className="shrink-0">
              {copied === "code" ? t("Copied!", "कॉपी हुआ!") : t("Copy code", "कोड कॉपी करें")}
            </Button>
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
              className="w-full rounded-control border border-cream-3 bg-cream-2/40 px-4 py-2.5 text-sm text-ink outline-none sm:flex-1"
            />
            <Button
              variant="primary"
              onClick={() => copy(link, "link")}
              className="shrink-0"
            >
              {copied === "link" ? t("Copied!", "कॉपी हुआ!") : t("Copy link", "लिंक कॉपी करें")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Settlement — earnings are reconciled with the Bhojpatra team. */}
      <div className="rounded-card border border-maroon/30 bg-maroon-soft/30 p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("Settle your earnings", "अपनी कमाई पाएं")}
        </h2>
        {rewardPercent > 0 && (
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-maroon">
              {money(reward)}
            </span>
            <span className="text-sm text-ink-soft">
              {t(
                `earned · ${rewardPercent}% of confirmed value`,
                `कमाए · पुष्ट मूल्य का ${rewardPercent}%`,
              )}
            </span>
          </div>
        )}
        <p className="mt-1 text-sm text-ink-soft">
          {rewardPercent > 0
            ? t(
                "This is your reward on confirmed bookings so far. Connect with the Bhojpatra team on WhatsApp to settle your payout.",
                "यह अब तक की पुष्ट बुकिंग पर आपका रिवॉर्ड है। अपना भुगतान पाने के लिए WhatsApp पर Bhojpatra टीम से जुड़ें।",
              )
            : t(
                "Your commission is calculated on confirmed bookings. Connect with the Bhojpatra team on WhatsApp to settle your payout.",
                "आपका कमीशन पुष्ट बुकिंग पर तय होता है। अपना भुगतान पाने के लिए WhatsApp पर Bhojpatra टीम से जुड़ें।",
              )}
        </p>
        {!verified && (
          <p className="mt-2 text-sm font-medium text-maroon">
            {t(
              `Payouts unlock once you're a Verified Bhojpatra Partner — complete ${threshold} bookings (${Math.min(
                completed,
                threshold,
              )}/${threshold} done).`,
              `पेआउट तब अनलॉक होगा जब आप सत्यापित Bhojpatra पार्टनर बनेंगे — ${threshold} बुकिंग पूरी करें (${Math.min(
                completed,
                threshold,
              )}/${threshold} पूर्ण)।`,
            )}
          </p>
        )}
        <Button
          variant="primary"
          href={referralPayoutHref(code || "—", name)}
          disabled={!verified}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4"
          leftIcon={<span aria-hidden="true">💬</span>}
        >
          {verified
            ? t("Connect with Bhojpatra", "Bhojpatra से जुड़ें")
            : t("Payouts locked", "पेआउट लॉक")}
        </Button>
      </div>
    </div>
  );
}

/* ── My Referrals ───────────────────────────────────────────────────────── */

function ReferralStatusBadge({ status }: { status: BookingStatus }) {
  const { t } = useLang();
  const tones: Record<BookingStatus, BadgeTone> = {
    Confirmed: "solid",
    Completed: "solid",
    Pending: "outline",
    Cancelled: "muted",
  };
  const label: Record<BookingStatus, string> = {
    Confirmed: t("Confirmed", "पुष्ट"),
    Completed: t("Completed", "पूर्ण"),
    Pending: t("Pending", "पेंडिंग"),
    Cancelled: t("Cancelled", "रद्द"),
  };
  return <Badge tone={tones[status]}>{label[status]}</Badge>;
}

function ReferralsPanel({ orders }: { orders: ReferredOrder[] }) {
  const { t } = useLang();
  const total = useMemo(() => orders.reduce((s, o) => s + o.amount, 0), [orders]);

  if (orders.length === 0) {
    return (
      <EmptyState
        title={t("No referrals yet", "अभी कोई रेफ़रल नहीं")}
        message={t(
          "Share your link or code — referred bookings show up here.",
          "अपना लिंक या कोड साझा करें — रेफ़र की गई बुकिंग यहाँ दिखेंगी।",
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm font-medium text-ink-soft">
          {t("Total referred value", "कुल रेफ़र मूल्य")}
        </p>
        <p className="mt-1 font-display text-2xl font-bold text-maroon">
          {money(total)}
        </p>
      </Card>

      <Card padding="none" className="overflow-hidden">
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
      </Card>
    </div>
  );
}
