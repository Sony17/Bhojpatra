"use client";

/**
 * The merged account hub. One person can hold several accounts at once —
 * customer (always, booking is universal), vendor and/or referral partner — so
 * this page shows a compact section for every account they hold and a prompt to
 * add the ones they don't. Each section links out to that account's full,
 * dedicated dashboard; this is the overview that ties them together.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppBar, Button, Card, EmptyState } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import {
  useSession,
  partnerMemberships,
  DASHBOARD_PATH,
  ACCOUNT_LABEL,
  type AccountType,
} from "@/lib/session";
import { fetchMyBookings, type StoredBooking } from "@/lib/bookings";
import { vendorStats } from "@/lib/data";
import { PARTNER_ROLE_LABEL, referralLink } from "@/lib/referral";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** A single labelled figure inside an account section. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-maroon/10 bg-cream/40 px-4 py-3">
      <p className="font-display text-lg font-bold text-ink break-words sm:text-2xl">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-soft">{label}</p>
    </div>
  );
}

/** The shared card frame each account section sits in. */
function SectionCard({
  title,
  badge,
  href,
  cta,
  children,
}: {
  title: string;
  badge: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section" padding="none" className="p-5 sm:p-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-lg text-ink sm:text-xl">{title}</h2>
          <span className="rounded-full bg-maroon/10 px-2.5 py-0.5 text-xs font-semibold text-maroon">
            {badge}
          </span>
        </div>
        <Button variant="ghost" size="sm" href={href} className="shrink-0">
          {cta} →
        </Button>
      </header>
      {children}
    </Card>
  );
}

export default function AccountsDashboard() {
  const { t } = useLang();
  const session = useSession();
  const [bookings, setBookings] = useState<StoredBooking[] | null>(null);

  useEffect(() => {
    let live = true;
    fetchMyBookings()
      .then((b) => live && setBookings(b))
      .catch(() => live && setBookings([]));
    return () => {
      live = false;
    };
  }, []);

  const bookingCounts = useMemo(() => {
    const list = bookings ?? [];
    return {
      total: list.length,
      confirmed: list.filter((b) => b.status === "Confirmed").length,
      due: list
        .filter((b) => b.status === "Confirmed" || b.status === "Pending")
        .reduce((sum, b) => sum + (b.amount - b.paid), 0),
    };
  }, [bookings]);

  if (!session) return null;

  const name = session.name?.trim();
  const memberships = partnerMemberships(session);
  const loading = bookings === null;

  // Accounts the person could still add (customer is universal, so never here).
  const addable = (
    [
      {
        type: "vendor" as const,
        title: t("List your catering business", "अपना कैटरिंग बिज़नेस सूचीबद्ध करें"),
        hint: t("Receive booking requests and manage your menu.", "बुकिंग अनुरोध प्राप्त करें और अपना मेन्यू प्रबंधित करें।"),
        href: "/signup?type=vendor",
      },
      {
        type: "partner" as const,
        title: t("Become a referral partner", "रेफ़रल पार्टनर बनें"),
        hint: t("Share your code and earn on every confirmed booking.", "अपना कोड साझा करें और हर पुष्ट बुकिंग पर कमाएं।"),
        href: "/signup?type=partner",
      },
    ] satisfies { type: AccountType; title: string; hint: string; href: string }[]
  ).filter((o) => !session.accounts.includes(o.type));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <AppBar
        title={t("My Dashboard", "मेरा डैशबोर्ड")}
        backHref="/"
        className="lg:hidden"
      />
      <div className="px-4 pb-16 sm:px-6">
      {/* Greeting + the accounts this person holds. */}
      <header className="mb-6 pt-4 lg:pt-0">
        <h1 className="text-app-title hidden text-ink lg:block">
          {name
            ? t(`Welcome back, ${name}`, `वापसी पर स्वागत है, ${name}`)
            : t("Welcome back", "वापसी पर स्वागत है")}
        </h1>
        <p className="mt-2 text-base text-ink-soft">
          {t(
            "Everything across your accounts, in one place.",
            "आपके सभी अकाउंट, एक ही जगह पर।",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {session.accounts.map((a) => (
            <span
              key={a}
              className="rounded-full border border-maroon/25 bg-cream px-3 py-1 text-xs font-semibold text-maroon"
            >
              {t(ACCOUNT_LABEL[a].en, ACCOUNT_LABEL[a].hi)}
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-5">
        {/* Customer — always shown, booking is universal. */}
        <SectionCard
          title={t("My Bookings", "मेरी बुकिंग")}
          badge={t(ACCOUNT_LABEL.customer.en, ACCOUNT_LABEL.customer.hi)}
          href={DASHBOARD_PATH.customer}
          cta={t("View all bookings", "सभी बुकिंग देखें")}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat
              label={t("Total", "कुल")}
              value={loading ? "—" : String(bookingCounts.total)}
            />
            <Stat
              label={t("Confirmed", "पुष्ट")}
              value={loading ? "—" : String(bookingCounts.confirmed)}
            />
            <Stat
              label={t("Amount Due", "देय राशि")}
              value={loading ? "—" : money.format(bookingCounts.due)}
            />
          </div>
          {!loading && bookingCounts.total === 0 && (
            <EmptyState
              className="mt-4 border-0 bg-cream/40 py-6 shadow-none"
              title={t("No bookings yet", "अभी कोई बुकिंग नहीं")}
              message={t(
                "You haven't booked a feast yet.",
                "आपने अभी तक कोई भोज बुक नहीं किया है।",
              )}
              action={
                <Button href="/vendors" variant="primary" size="sm">
                  {t("Browse caterers", "कैटरर्स ब्राउज़ करें")}
                </Button>
              }
            />
          )}
        </SectionCard>

        {/* Vendor — only if held. */}
        {session.accounts.includes("vendor") && (
          <SectionCard
            title={t("Vendor", "वेंडर")}
            badge={t(ACCOUNT_LABEL.vendor.en, ACCOUNT_LABEL.vendor.hi)}
            href={DASHBOARD_PATH.vendor}
            cta={t("Open vendor dashboard", "वेंडर डैशबोर्ड खोलें")}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {vendorStats.map((s) => (
                <Stat key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              href="/vendor/register"
              className="mt-4"
            >
              {t("Complete business profile & KYC", "बिज़नेस प्रोफ़ाइल और केवाईसी पूरी करें")} →
            </Button>
          </SectionCard>
        )}

        {/* Referral partner — only if held. */}
        {session.accounts.includes("partner") && (
          <SectionCard
            title={t("Referral Partner", "रेफ़रल पार्टनर")}
            badge={t(ACCOUNT_LABEL.partner.en, ACCOUNT_LABEL.partner.hi)}
            href={DASHBOARD_PATH.partner}
            cta={t("Open referral dashboard", "रेफ़रल डैशबोर्ड खोलें")}
          >
            {memberships.length ? (
              <ul className="flex flex-col gap-2.5">
                {memberships.map((m) => (
                  <li
                    key={m.type}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-maroon/10 bg-cream/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {PARTNER_ROLE_LABEL[m.type]}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {referralLink(m.referralCode)}
                      </p>
                    </div>
                    <span className="font-display rounded-lg bg-maroon px-3 py-1 text-sm font-bold tracking-wider text-cream">
                      {m.referralCode}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">
                {t(
                  "Your referral dashboard has your codes and earnings.",
                  "आपके रेफ़रल डैशबोर्ड में आपके कोड और कमाई हैं।",
                )}
              </p>
            )}
          </SectionCard>
        )}

        {/* Add the accounts they don't have yet. */}
        {addable.length > 0 && (
          <Card as="section" padding="lg" className="border-dashed border-maroon/25 bg-cream/30">
            <h2 className="font-display text-lg text-ink sm:text-xl">
              {t("Add another account", "एक और अकाउंट जोड़ें")}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {t(
                "Use the same login — new accounts attach to this one.",
                "वही लॉगिन उपयोग करें — नए अकाउंट इसी से जुड़ जाते हैं।",
              )}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {addable.map((o) => (
                <Card
                  key={o.type}
                  as={Link}
                  href={o.href}
                  interactive
                  padding="none"
                  className="px-4 py-3.5"
                >
                  <p className="text-sm font-semibold text-maroon">{o.title}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{o.hint}</p>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
      </div>
    </div>
  );
}
