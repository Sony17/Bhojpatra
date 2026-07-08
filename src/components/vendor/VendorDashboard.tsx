"use client";

/**
 * Vendor dashboard. A thin shell around the one surface that's wired to real
 * data — the "My Menu" builder. The header mirrors the signed-in vendor's live
 * record: real business name, KYC verification and the marketplace tier(s) an
 * admin assigned during approval.
 */

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import MenuBuilder from "@/components/vendor/MenuBuilder";
import BainaBoxSpecial from "@/components/BainaBoxSpecial";
import { sortTiers, type VendorTier } from "@/lib/admin/types";

/** Header summary drawn from GET /api/vendor/menu (the vendor's live record). */
interface VendorSummary {
  business: string;
  verified: boolean;
  tiers?: VendorTier[];
}

const TIER_HI: Record<VendorTier, string> = {
  Silver: "सिल्वर",
  Gold: "गोल्ड",
  Platinum: "प्लैटिनम",
};

export default function VendorDashboard() {
  const [summary, setSummary] = useState<VendorSummary | null>(null);
  const [fallbackName, setFallbackName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetch("/api/vendor/menu")
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
      )
      .then(
        (d: {
          vendor: VendorSummary | null;
          prefill?: { business?: string };
        }) => {
          if (!live) return;
          // Before a profile is saved the vendor record is null — fall back to
          // whatever name their registration application carried.
          if (d.vendor) setSummary(d.vendor);
          else setFallbackName(d.prefill?.business ?? "");
          setLoading(false);
        },
      )
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:py-16">
      <DashboardHeader
        summary={summary}
        fallbackName={fallbackName}
        loading={loading}
      />
      {/* "Baina Box, specially by Bhojpatra" — admin-editable signature card. */}
      <div className="mt-6">
        <BainaBoxSpecial variant="dashboard" />
      </div>
      <div className="mt-8">
        <MenuBuilder />
      </div>
    </section>
  );
}

/* ── Header ─────────────────────────────────────────────────────────────── */

function DashboardHeader({
  summary,
  fallbackName,
  loading,
}: {
  summary: VendorSummary | null;
  fallbackName: string;
  loading: boolean;
}) {
  const { t } = useLang();
  const businessName =
    summary?.business || fallbackName || t("Your business", "आपका व्यवसाय");
  const tiers = summary?.tiers ? sortTiers(summary.tiers) : [];

  return (
    <div className="rounded-2xl border border-cream-3 bg-white p-5 shadow-sm sm:p-6">
      <p className="eyebrow text-sm font-medium text-gold">
        {t("Vendor Dashboard", "वेंडर डैशबोर्ड")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl text-ink sm:text-3xl">
          {businessName}
        </h1>

        {!loading &&
          (summary?.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-maroon px-3 py-1 text-xs font-semibold text-cream">
              <span aria-hidden="true">✓</span> {t("Verified", "वेरिफाइड")}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full border border-cream-3 bg-cream-2 px-3 py-1 text-xs font-semibold text-ink-soft">
              {t("Pending verification", "सत्यापन लंबित")}
            </span>
          ))}

        {/* Marketplace tier(s) assigned by an admin at approval. */}
        {tiers.map((tier) => (
          <span
            key={tier}
            className="inline-flex items-center gap-1 rounded-full border border-cream-3 bg-cream-2 px-3 py-1 text-xs font-semibold text-ink"
          >
            <span aria-hidden="true" className="text-gold">
              ◆
            </span>{" "}
            {t(tier, TIER_HI[tier])}
          </span>
        ))}
      </div>
      <p className="font-script mt-2 text-lg text-ink-soft">
        {t(
          "Welcome back — here's what's cooking today.",
          "वापसी पर स्वागत है — आज क्या पक रहा है, यहाँ देखें।",
        )}
      </p>
    </div>
  );
}
