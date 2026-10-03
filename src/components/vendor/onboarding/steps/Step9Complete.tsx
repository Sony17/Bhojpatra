"use client";

import { R } from "../ui";

/** Handover: "09. Registration successfully submitted!" */
export default function Step9Complete({
  vendorId,
  onPreview,
  onBack,
}: {
  vendorId: string;
  onPreview: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-in fade-in duration-200">
      <section className="mx-auto max-w-2xl rounded-card border border-cream/60 bg-white p-6 text-center shadow-[0_2px_6px_rgba(0,0,0,0.04)] sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-maroon text-3xl font-bold text-cream" aria-hidden>
          ✓
        </div>
        <h1 className="mt-4 font-display text-[22px] leading-tight text-ink sm:text-[26px]">
          <R d="Registration successfully submitted!" m="Registration Submitted!" />
        </h1>
        <p className="mx-auto mt-2 hidden max-w-md text-[13px] text-ink/60 sm:block">
          Your application has been received and routed for statutory KYC and menu compliance verification.
        </p>

        <div className="mx-auto mt-6 max-w-sm rounded-card border border-cream bg-cream/15 p-4">
          <div className="hidden text-[11px] font-bold uppercase tracking-wide text-ink/50 sm:block">Assigned Bhojpatra Vendor ID</div>
          <div className="mt-1 font-mono text-2xl font-bold text-maroon">
            <span className="sm:hidden text-sm [font-family:inherit] text-ink/60">Vendor ID: </span>
            {vendorId}
          </div>
          <div className="mt-2 hidden text-xs font-semibold text-ink sm:block">KYC Status: Under Express Review (12–24h)</div>
        </div>

        <p className="mx-auto mt-5 hidden max-w-md text-xs text-ink/60 sm:block">
          All identity and menu offerings gathered here feed your live Vendor Profile. Your vendor portal focuses on:{" "}
          <strong className="text-ink">Dashboard · My Services · Orders</strong> (other modules coming soon).
        </p>

        <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <a
            href="/vendor/dashboard"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-maroon px-6 text-[13px] font-bold text-cream"
          >
            🚀 Enter Vendor Dashboard →
          </a>
          <button
            type="button"
            onClick={onPreview}
            className="hidden min-h-[48px] items-center justify-center rounded-full border border-cream px-5 text-[13px] font-bold text-ink/80 sm:inline-flex"
          >
            Preview Live Storefront 👁️
          </button>
          <button
            type="button"
            onClick={onBack}
            className="min-h-[48px] rounded-full border border-cream px-5 text-[13px] font-bold text-ink/80"
          >
            ← Back
          </button>
        </div>
      </section>
    </div>
  );
}
