"use client";

/** Handover: "09. Registration successfully submitted!" (view-complete). */
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
      {/* Desktop (prototype desktop article) */}
      <div className="content-card vob-d-flex" style={{ textAlign: "center", padding: "48px 24px", flexDirection: "column" }}>
        <div
          aria-hidden
          style={{
            width: 72,
            height: 72,
            background: "var(--color-red)",
            color: "var(--color-cream)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 36,
            margin: "0 auto 16px auto",
            boxShadow: "var(--shadow-brand)",
          }}
        >
          ✓
        </div>
        <h1 className="step-heading" style={{ fontSize: 28 }}>
          Registration successfully submitted!
        </h1>
        <p className="step-subtext" style={{ margin: "8px auto 20px auto" }}>
          Your application has been received and routed for statutory KYC and menu compliance verification.
        </p>

        <div
          style={{
            background: "var(--bg-cream-tint)",
            border: "1px solid var(--color-cream)",
            borderRadius: "var(--radius-control)",
            padding: 14,
            maxWidth: 440,
            width: "100%",
            margin: "0 auto 24px auto",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--color-black-60)" }}>Assigned Bhojpatra Vendor ID</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--color-red)", letterSpacing: 1, marginTop: 2 }}>{vendorId}</div>
          <div style={{ fontSize: 11, color: "var(--color-black-80)", marginTop: 6 }}>
            KYC Status: <strong style={{ color: "var(--color-veg)" }}>Under Express Review (12–24h)</strong>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <a
            href="/vendor/dashboard"
            className="btn-next"
            style={{ background: "var(--color-red)", color: "var(--color-cream)", fontWeight: 800, padding: "9px 22px", textDecoration: "none" }}
          >
            🚀 Enter Vendor Dashboard →
          </a>
          <button type="button" className="btn-back" onClick={onPreview}>
            Preview Live Storefront 👁️
          </button>
          <button type="button" className="btn-back" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      {/* Phone (prototype compact mobile article) */}
      <div className="content-card vob-m-flex" style={{ textAlign: "center", padding: "32px 14px", flexDirection: "column" }}>
        <div aria-hidden style={{ fontSize: 32, color: "var(--color-red)" }}>
          ✓
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Registration Submitted!</h2>
        <p style={{ fontSize: 12, color: "var(--color-black-60)", marginTop: 6 }}>Vendor ID: {vendorId}</p>
        <a
          href="/vendor/dashboard"
          className="btn-next"
          style={{
            width: "100%",
            marginTop: 14,
            background: "var(--color-red)",
            color: "var(--color-cream)",
            fontWeight: 800,
            padding: 10,
            justifyContent: "center",
            textDecoration: "none",
          }}
        >
          🚀 Enter Vendor Dashboard →
        </a>
        <button type="button" className="btn-back" onClick={onBack} style={{ width: "100%", marginTop: 10, justifyContent: "center" }}>
          ← Back
        </button>
      </div>
    </div>
  );
}
