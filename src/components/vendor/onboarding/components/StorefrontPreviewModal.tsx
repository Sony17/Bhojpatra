"use client";

import Image from "next/image";
import type { OnboardingState } from "../VendorOnboarding";
import { BtnBack, BtnNext, Sheet } from "../ui";

/** Handover: "Customer Storefront Preview" (#modal-storefront-preview — optional, "good but additional"). */
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
      <p style={{ fontSize: 12, color: "var(--color-black-60)", marginBottom: 14 }}>
        This preview shows exactly how your onboarded profile and signature feast will appear to celebration hosts
        browsing the Bhojpatra marketplace:
      </p>

      {/* Simulated Bhojpatra Marketplace Catalog Card */}
      <div className="storefront-preview-card">
        <div className="storefront-card-hero">
          <Image src={hero} alt={data.packageName || data.businessName || "Hero"} fill unoptimized sizes="820px" />
          <div className="storefront-hero-overlay">
            <div className="storefront-hero-tags">
              <span className="storefront-hero-tag" style={{ background: "var(--color-cream)", color: "var(--color-red)" }}>
                Feast Booking Partner
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-white)" }}>{data.businessName || "Your Catering Brand"}</h2>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>{data.cuisines.join(" · ")}</p>
          </div>
        </div>
        <div className="storefront-card-body">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-black)" }}>
              {data.city} · Min {data.minPax} Guests
            </div>
            {data.googleRating ? (
              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-red)" }}>
                {data.googleRating} ★ ({data.googleReviews ?? 0} reviews)
              </div>
            ) : null}
          </div>

          {/* Signature Tags */}
          {signature.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-black-60)" }}>Signature Specialties:</span>
              <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                {signature.map((s) => (
                  <span key={s} className="spread-chip" style={{ background: "var(--color-cream)", color: "var(--color-red)", fontWeight: 700 }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--color-cream-30)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 11, color: "var(--color-black-60)" }}>Feast starts from:</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-red)" }}>
                ₹{data.priceFrom} <small style={{ fontSize: 11, color: "var(--color-black-60)" }}>/ plate</small>
              </div>
            </div>
            {/* Preview only — the real booking flow opens once the profile is live. */}
            <BtnNext disabled>
              Book This Caterer →
            </BtnNext>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
