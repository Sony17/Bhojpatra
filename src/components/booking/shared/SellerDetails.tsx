"use client";

import type { SellerDetails } from "@/lib/sellerDetails";
import { useSiteContent } from "@/lib/sitePages";

/* ─── "Sold by" card ──────────────────────────────────────────────────────
 * Who is cooking this order — business name, city, GSTIN and FSSAI licence —
 * at the foot of each checkout (Single Stall, feast, Baina Box), plus
 * Bhojpatra's support line for grievances. PAN/Aadhaar never appear here
 * (stripped in `lib/sellerDetails.ts`). Only admin-verified numbers reach it;
 * renders nothing when no vendor has any.
 */
export default function SellerDetailsCard({
  t,
  sellers,
  className = "mt-4",
}: {
  t: (en: string, hi: string) => string;
  sellers: SellerDetails[];
  className?: string;
}) {
  const { contact } = useSiteContent();
  if (!sellers.length) return null;
  return (
    <section
      aria-label={t("Sold by", "विक्रेता")}
      className={`rounded-2xl border border-cream-3/80 bg-white p-3 shadow-soft sm:p-4 ${className}`}
    >
      <h3 className="flex items-center gap-2 font-sans text-[13px] font-semibold text-ink sm:text-[15px]">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-maroon" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        {t("Sold by", "विक्रेता")}
      </h3>
      <ul className="mt-2 divide-y divide-cream-3/80">
        {sellers.map((s) => {
          const rows: [string, string][] = [
            ...(s.gstin ? [[t("GSTIN", "GSTIN"), s.gstin] as [string, string]] : []),
            ...(s.fssai ? [[t("FSSAI Lic.", "FSSAI लाइसेंस"), s.fssai] as [string, string]] : []),
          ];
          return (
            <li key={s.name} className="py-2 first:pt-0 last:pb-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-semibold text-ink">
                {s.name}
                <span className="rounded-full bg-cream px-2 py-px text-[10px] font-semibold uppercase tracking-wide text-maroon">
                  {t("Verified", "सत्यापित")}
                </span>
              </p>
              {s.location && <p className="mt-0.5 text-xs text-ink-soft">{s.location}</p>}
              <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                {rows.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="text-ink-soft">{label}</dt>
                    <dd className="min-w-0 break-all tabular-nums tracking-wide text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
      {contact.phoneDisplay && (
        <p className="mt-2 border-t border-cream-3/80 pt-2 text-xs text-ink-soft">
          {t("Order issue? Bhojpatra support:", "ऑर्डर में समस्या? Bhojpatra सहायता:")}{" "}
          <a href={`tel:+${contact.whatsapp}`} className="font-semibold text-maroon hover:underline">
            {contact.phoneDisplay}
          </a>
        </p>
      )}
    </section>
  );
}
