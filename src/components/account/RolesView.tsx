"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import {
  useSessionStatus,
  hasAccount,
  ACCOUNT_LABEL,
  DASHBOARD_PATH,
  type AccountType,
} from "@/lib/session";
import { Button, Card, Badge } from "@/components/ui";

/**
 * "Roles" — the account *types* this one login holds (Customer / Vendor /
 * Partner). Customer is universal; Vendor and Partner are add-ons. Held roles
 * link to their dashboard; missing ones link into the existing add-account
 * signup flow (`/signup?type=…`) — the same destinations the merged dashboard
 * uses. This surfaces the multi-account system; it is not team/staff RBAC.
 */
const ROLES: {
  type: AccountType;
  en: string;
  hi: string;
  addHref?: string;
}[] = [
  {
    type: "customer",
    en: "Book caterers, venues and services for your events.",
    hi: "अपने आयोजनों के लिए कैटरर, वेन्यू और सेवाएँ बुक करें।",
  },
  {
    type: "vendor",
    en: "List your catering business and receive booking orders.",
    hi: "अपना कैटरिंग व्यवसाय सूचीबद्ध करें और बुकिंग ऑर्डर पाएँ।",
    addHref: "/signup?type=vendor",
  },
  {
    type: "partner",
    en: "Refer clients to Bhojpatra and earn on every booking.",
    hi: "भोजपत्र पर ग्राहक रेफ़र करें और हर बुकिंग पर कमाएँ।",
    addHref: "/signup?type=partner",
  },
];

export default function RolesView() {
  const { t } = useLang();
  const router = useRouter();
  const session = useSessionStatus();

  // Roles is a caterer-only screen. Non-vendors (and anyone who lands here by
  // typing the URL) are bounced back to their profile; the menu/nav already
  // hide the entry for them.
  useEffect(() => {
    if (session === undefined) return; // still loading — wait
    if (!session || !session.accounts.includes("vendor")) {
      router.replace("/account/profile");
    }
  }, [session, router]);

  // While loading, or for a non-vendor being bounced, render nothing. This also
  // narrows `session` to a signed-in vendor for the rest of the component.
  if (!session || !session.accounts.includes("vendor")) {
    return <div className="min-h-[40vh]" />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        {t(
          "These are the account types on your login. Open the ones you hold, or add another — it all stays under this one account.",
          "ये आपके लॉगिन पर मौजूद अकाउंट प्रकार हैं। जो आपके पास हैं उन्हें खोलें, या दूसरा जोड़ें — सब कुछ इसी एक अकाउंट में रहता है।",
        )}
      </p>

      {ROLES.map((role) => {
        const held = hasAccount(session, role.type);
        const label = t(ACCOUNT_LABEL[role.type].en, ACCOUNT_LABEL[role.type].hi);
        return (
          <Card
            key={role.type}
            padding="lg"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{label}</h2>
                {held ? (
                  <Badge status="Active">{t("Active", "सक्रिय")}</Badge>
                ) : (
                  <Badge tone="muted">{t("Not added", "जोड़ा नहीं गया")}</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {t(role.en, role.hi)}
              </p>
            </div>

            <div className="shrink-0">
              {held ? (
                <Button
                  href={DASHBOARD_PATH[role.type]}
                  variant="secondary"
                  size="sm"
                >
                  {t("Open", "खोलें")}
                </Button>
              ) : (
                role.addHref && (
                  <Button href={role.addHref} variant="primary" size="sm">
                    {t("Add", "जोड़ें")}
                  </Button>
                )
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
