"use client";

import Image from "next/image";
import type { OnboardingState } from "../VendorOnboarding";
import { BtnBack, BtnNext, Sheet } from "../ui";

/** Handover: "Customer Storefront Preview" (optional — "good but additional"). */
export default function StorefrontPreviewModal({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: OnboardingState;
}) {
  const hero =
    data.image || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=70";
  const signature = data.featured.slice(0, 4);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Customer Storefront Preview"
      wide
      footer={<BtnBack onClick={onClose}>Close Preview</BtnBack>}
    >
      <p className="mb-4 text-[13px] text-ink/70">
        This preview shows exactly how your onboarded profile and signature feast will appear to celebration hosts
        browsing the Bhojpatra marketplace:
      </p>
      <article className="overflow-hidden rounded-card border border-cream bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
        <div className="relative h-44 w-full">
          <Image src={hero} alt={data.packageName || data.businessName} fill unoptimized className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="rounded-full bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase text-cream">
              Feast Booking Partner
            </span>
            <h2 className="mt-1 font-display text-2xl">{data.businessName || "Your Catering Brand"}</h2>
            <p className="text-xs text-cream">{data.cuisines.slice(0, 3).join(" · ")}</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ink/70">
              {data.city} · Min {data.minPax} Guests
            </span>
            {data.googleRating ? (
              <span className="font-bold text-ink">
                {data.googleRating} <span className="text-maroon">★</span> ({data.googleReviews ?? 0} reviews)
              </span>
            ) : null}
          </div>
          {signature.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-ink/60">Signature Specialties:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {signature.map((s) => (
                  <span key={s} className="rounded-full bg-cream/40 px-2 py-0.5 text-[11px] font-semibold text-ink">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-end justify-between gap-3 border-t border-cream/50 pt-3">
            <div>
              <span className="text-[11px] text-ink/60">Feast starts from:</span>
              <div className="text-xl font-bold text-maroon">
                ₹{data.priceFrom} <small className="text-xs font-normal text-ink/60">/ plate</small>
              </div>
            </div>
            <BtnNext disabled>Book This Caterer →</BtnNext>
          </div>
        </div>
      </article>
    </Sheet>
  );
}
