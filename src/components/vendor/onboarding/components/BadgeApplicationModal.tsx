"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { RecognitionBadgeKey, VendorBadgesState } from "@/lib/vendorMenus";

export interface BadgeCriterion {
  id: string;
  label: string;
  desc: string;
  exception?: string;
  orCondition?: string;
}

interface BadgeMeta {
  key: RecognitionBadgeKey;
  title: string;
  icon: string;
  badgeTag: string;
  description: string;
  /** Mandatory criteria. */
  criteriaList: BadgeCriterion[];
  /** Optional, non-mandatory plus points (City Icon only). */
  plusPoints?: BadgeCriterion[];
  /** Requirement count copy: [badge card dropdown, modal pill]. */
  reqCount: [string, string];
}

const c = (id: string, label: string, desc: string, extra?: Partial<BadgeCriterion>): BadgeCriterion => ({
  id,
  label,
  desc,
  ...extra,
});

/** Handover badge configs (Verified / City Icon / Heritage Caterer). */
export const BADGE_DEFINITIONS: Record<RecognitionBadgeKey, BadgeMeta> = {
  verified: {
    key: "verified",
    title: "Verified Caterer",
    icon: "🛡️",
    badgeTag: "Entry-Level Recognition",
    reqCount: ["10 mandatory criteria", "10 Mandatory Criteria"],
    description: "Entry-level recognition for vendors meeting Bhojpatra's core quality and operational standards.",
    criteriaList: [
      c("fssai", "Valid FSSAI", "Active Food Safety and Standards Authority of India licence."),
      c("gst", "GST where applicable", "Valid GSTIN registration based on statutory turnover thresholds."),
      c("pan_bank", "PAN + business/bank details", "Verified commercial PAN and active business bank account for payouts."),
      c("experience_2y", "Minimum 2 years operating experience", "Demonstrated commercial track record in food service or catering.", {
        exception: "Exception allowed for a strong established brand/new entity",
      }),
      c("kitchen", "Proper kitchen / food preparation setup", "Dedicated commercial kitchen facility with adequate storage and clean prep stations."),
      c("hygiene", "Hygiene & food-safety standards pass", "Sanitized cooking areas, food-grade vessels, pest control, and staff hygiene."),
      c("menu_defined", "Menu, pricing and service area clearly defined", "Transparent per-plate menus, package inclusions, and designated delivery radii."),
      c("references", "At least 3–5 genuine event references/orders", "Verifiable client contacts or completed catering event orders."),
      c("no_complaints", "No serious unresolved customer complaints", "Zero open hygiene, food safety, or refund grievances."),
      c("tasting", "Bhojpatra quality inspection / tasting pass", "Satisfactory kitchen audit and sensory evaluation by food panel."),
    ],
  },
  icon: {
    key: "icon",
    title: "City Icon Caterer",
    icon: "⭐",
    badgeTag: "City-Level Recognition",
    reqCount: ["8 mandatory criteria + 6 Plus Points", "8 Mandatory Criteria"],
    description:
      "Prestigious city-level recognition for established caterers with proven scale, reputation, and excellence.",
    criteriaList: [
      c("history_5y", "Minimum 5 years of operating history", "Well-established commercial catering presence."),
      c("reputation", "Recognised reputation in the city/region", "Known brand equity among local event planners and banquet venues."),
      c("reviews", "Strong customer reviews/references", "High satisfaction scores across multiple verified celebrations."),
      c("quality", "Consistent food quality", "Reliable taste, temperature maintenance, and presentation across large guest volumes."),
      c("execution", "Professional event execution", "Punctual live stall setup, organized buffet management, and courteous stewards."),
      c("menu_depth", "Good menu depth & presentation", "Versatile multi-cuisine repertoire with refined aesthetic plating."),
      c("logistics", "Reliable manpower/logistics", "Dedicated transport, chafing equipment, uniformed crew, and backup chef teams."),
      c("audit", "Bhojpatra tasting + operational audit pass", "Comprehensive review of commercial kitchen and live event audit."),
    ],
    plusPoints: [
      c("signature", "Known for a signature cuisine/menu", "Famous city landmark dish or unique regional specialty."),
      c("large_events", "Regularly caters weddings/large celebrations", "Experience handling 500+ to 2,000+ guest banquets."),
      c("brand_recall", "Strong local brand recall", "Household recognition within the home city."),
      c("notable_clients", "Notable venues/clients/events served", "Official vendor at premier clubs, government functions, or luxury lawns."),
      c("social", "Social presence and customer reputation", "Active digital profile with authentic customer photos and press mentions."),
      c("repeat", "Repeat customers", "Demonstrated recurring bookings for corporate or family milestone events."),
    ],
  },
  heritage: {
    key: "heritage",
    title: "Heritage Caterer",
    icon: "👑",
    badgeTag: "Generational & Culinary Legacy",
    reqCount: ["Exactly 9 legacy criteria", "Exactly 9 Legacy Criteria"],
    description:
      "Our most exclusive recognition for caterers with a long-standing culinary legacy and generational heritage.",
    criteriaList: [
      c("legacy_15y", "Minimum 15 years continuous legacy", "Demonstrable decade-and-a-half or greater operational presence."),
      c("family_run", "Preferably family-run/legacy food business", "Traditional family ownership passed through generations."),
      c("tradition", "Strong connection with local culinary tradition", "Rooted in authentic regional cuisine and culinary heritage."),
      c(
        "generations",
        "Multiple generations involved OR demonstrable long-standing legacy",
        "Active leadership from multi-generational family or established legacy culinary masters.",
        { orCondition: "Preserved requirement: Multiple generations involved OR demonstrable long-standing legacy" },
      ),
      c("local_reputation", "Recognised local reputation", "Revered culinary standing within the community."),
      c("traditional_dishes", "Signature/traditional dishes", "Celebrated recipes preserved through traditional preparation methods."),
      c("consistency", "Consistent quality over the years", "Uncompromising taste standards maintained across decades."),
      c("history_refs", "Strong historical/customer references", "Generations of patron families and archival proof of legacy."),
      c("verification", "Bhojpatra tasting + verification process pass", "Curated historical evaluation and signature dish tasting clearance."),
    ],
  },
};


/** Badge-specific free-text field (prototype "Application Details" stage copy). */
const DETAIL_FIELD: Record<RecognitionBadgeKey, { label: string; hint?: string; placeholder: string }> = {
  verified: {
    label: "Commercial Kitchen Setup & Equipment",
    hint: "Briefly summarize cooking stations, cold storage, and hygiene equipment.",
    placeholder: "Dedicated commercial catering kitchen with separate veg prep line, cold room, and 45kg handi dum capacity.",
  },
  icon: {
    label: "Notable Venues, Celebrities & High-Profile Events Served",
    placeholder: "UP State Annual Gala (800 guests), Taj Lucknow Lawn Reception (1200 guests).",
  },
  heritage: {
    label: "Generational Continuity OR Long-Standing Legacy Details",
    hint: "ℹ️ Explicit criterion: Multiple generations involved OR demonstrable long-standing culinary legacy.",
    placeholder: "Founded in 1978. Now managed by 3rd-generation family chefs preserving traditional dum pukht recipes.",
  },
};

const capsLabel = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.5,
} as const;

/** Requirement checklist rows (.badge-req-list > .badge-req-item). With `checked`
 *  the ✓ mark becomes a real checkbox the vendor ticks to self-certify. */
export function BadgeReqItems({
  items,
  plus,
  numbered,
  checked,
  onToggle,
}: {
  items: BadgeCriterion[];
  plus?: boolean;
  numbered?: boolean;
  checked?: Record<string, boolean>;
  onToggle?: (id: string) => void;
}) {
  return (
    <ul className="badge-req-list">
      {items.map((r, i) => {
        const body = (
          <div>
            <strong>
              {numbered ? `${i + 1}. ` : ""}
              {r.label}:
            </strong>{" "}
            {numbered ? (
              <div style={{ fontSize: 12, color: "var(--color-black-70)" }}>{r.desc}</div>
            ) : (
              <span style={{ color: "var(--color-black-70)" }}>{r.desc}</span>
            )}
            {r.exception && <div className="badge-exception-callout">ℹ️ Exception: {r.exception}</div>}
            {r.orCondition && <div className="badge-exception-callout">ℹ️ {r.orCondition}</div>}
          </div>
        );
        if (checked && onToggle) {
          return (
            <li key={r.id} className="badge-req-item">
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", minHeight: 32 }}>
                <input
                  type="checkbox"
                  checked={Boolean(checked[r.id])}
                  onChange={() => onToggle(r.id)}
                  style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: "var(--color-red)" }}
                />
                {body}
              </label>
            </li>
          );
        }
        return (
          <li key={r.id} className="badge-req-item">
            {plus ? (
              <span style={{ color: "var(--color-black)", fontWeight: 800 }}>+</span>
            ) : (
              <span className="badge-req-check">✓</span>
            )}
            {body}
          </li>
        );
      })}
    </ul>
  );
}

interface BadgeApplicationModalProps {
  badgeKey: RecognitionBadgeKey | null;
  badgesState: VendorBadgesState;
  onClose: () => void;
  onSuccess: (updatedState: VendorBadgesState) => void;
}

/**
 * Handover `#modal-badge-application` (renderBadgeModalContent). The prototype's
 * 6-stage flow is condensed to the app's single-screen apply flow
 * (requirements + details + declaration → submit) plus the "Application
 * Submitted" confirmation stage.
 */
export default function BadgeApplicationModal({ badgeKey, badgesState, onClose, onSuccess }: BadgeApplicationModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [story, setStory] = useState("");
  const [declared, setDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const meta = badgeKey ? BADGE_DEFINITIONS[badgeKey] : null;
  const isGranted = badgeKey ? badgesState.granted?.includes(badgeKey) : false;
  const isApplied = badgeKey ? badgesState.applied?.includes(badgeKey) : false;
  const open = Boolean(badgeKey);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submit = async () => {
    if (!badgeKey) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/vendor/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgeKey,
          criteria: checked,
          details: story.trim() ? { notes: story.trim() } : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to submit badge application.");
        return;
      }
      // Parent state flips this badge to "applied" → the sheet shows the
      // prototype's "Application Submitted" stage.
      if (data.badges) onSuccess(data.badges);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!meta || !badgeKey || typeof document === "undefined") return null;
  const done = Boolean(isGranted || isApplied);
  const step = done ? 2 : 1;
  const stepName = done ? (isGranted ? "Badge Granted" : "Application Submitted") : "Application Details";
  const field = DETAIL_FIELD[badgeKey];
  const application = [...(badgesState.applications ?? [])].reverse().find((a) => a.badgeKey === badgeKey);
  const submittedAt = application?.appliedAt
    ? new Date(application.appliedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const toggle = (id: string) => setChecked((p) => ({ ...p, [id]: !p[id] }));

  const header = (
    <div className="badge-modal-header">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22 }} aria-hidden>
            {meta.icon}
          </span>
          <span className="modal-title" style={{ fontSize: 17 }}>
            {meta.title}
          </span>
          <span className="vob-badge">{meta.badgeTag}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 11.5, color: "var(--color-black-60)" }}>
            Step {step} of 2: <strong>{stepName}</strong>
          </span>
          <div className="badge-step-stepper" aria-hidden="true">
            {[1, 2].map((s) => (
              <div key={s} className={`badge-step-dot ${s === step ? "active" : s < step ? "completed" : ""}`} />
            ))}
          </div>
        </div>
      </div>
      <button type="button" className="modal-close-btn" onClick={onClose} title="Close" aria-label="Close">
        ✕
      </button>
    </div>
  );

  const formBody = (
    <div className="modal-body">
      <div className="badge-hero-intro">
        <div style={{ ...capsLabel, fontWeight: 800, color: "var(--color-red)" }}>Bhojpatra Recognition Program</div>
        <h3 style={{ fontSize: 18, margin: "4px 0 6px 0", color: "var(--color-black)" }}>{meta.title}</h3>
        <p style={{ fontSize: 13, color: "var(--color-black-80)", lineHeight: 1.5, margin: 0 }}>{meta.description}</p>
      </div>

      <p style={{ fontSize: 13, color: "var(--color-black-70)", marginTop: 0, marginBottom: 14, lineHeight: 1.5 }}>
        Please review the official qualification criteria for the <strong>{meta.title}</strong> badge. You must meet all
        mandatory criteria to qualify for certification.
      </p>

      <div
        style={{
          background: "var(--bg-cream-tint)",
          border: "1px solid var(--color-cream-30)",
          borderRadius: "var(--radius-control)",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <strong style={{ ...capsLabel, color: "var(--color-red)" }}>Mandatory Criteria</strong>
          <span className="vob-badge">{meta.reqCount[1]}</span>
        </div>
        <BadgeReqItems items={meta.criteriaList} numbered checked={checked} onToggle={toggle} />

        {meta.plusPoints && (
          <>
            <div className="badge-plus-points-header" style={{ marginTop: 16, gap: 8 }}>
              <strong style={{ ...capsLabel, color: "var(--color-black)" }}>Optional Plus Points</strong>
              <span className="vob-badge" style={{ fontSize: 10 }}>
                6 Non-Mandatory Additional Strengths
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "var(--color-black-60)", margin: "4px 0 8px 0" }}>
              Plus Points demonstrate exceptional regional strength and accelerate council clearance, but are not
              strictly mandatory.
            </p>
            <BadgeReqItems items={meta.plusPoints} numbered checked={checked} onToggle={toggle} />
          </>
        )}
      </div>

      <p style={{ fontSize: 12.5, color: "var(--color-black-70)", margin: "16px 0 12px 0" }}>
        Complete the specific verification parameters for your <strong>{meta.title}</strong> application:
      </p>
      <div className="form-group">
        <label className="form-label" htmlFor="badge-notes">
          {field.label}
        </label>
        <textarea
          id="badge-notes"
          rows={2}
          className="form-textarea"
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder={field.placeholder}
        />
        {field.hint && <span className="field-hint">{field.hint}</span>}
      </div>

      <div className="badge-declaration-box">
        <strong style={{ color: "var(--color-black)", display: "block", marginBottom: 6 }}>
          Vendor Commitment &amp; Truthfulness Undertaking:
        </strong>
        <p style={{ margin: "0 0 10px 0" }}>
          &ldquo;I solemnly declare and confirm that all operational history, commercial kitchen facilities, licensing
          details, and references provided in this application are true, accurate, and verifiable. I understand that
          misrepresentation or failure to meet sensory tasting standards will result in application rejection or badge
          revocation.&rdquo;
        </p>
        <div style={{ background: "var(--color-cream-20)", borderRadius: 6, padding: 10, marginTop: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              fontSize: 12.5,
              fontWeight: 700,
              color: "var(--color-red)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              id="badge-declaration-check"
              checked={declared}
              onChange={(e) => setDeclared(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: "var(--color-red)" }}
            />
            <span>I accept this declaration and submit my application for council verification.</span>
          </label>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--color-black-60)", lineHeight: 1.45 }}>
        ℹ️ Once submitted, your application enters active review. You can monitor verification progress or update
        documentation through your onboarding concierge.
      </div>
      {error && (
        <p className="vob-field-error" role="alert">
          ⚠️ {error}
        </p>
      )}
    </div>
  );

  const row = (last?: boolean) =>
    ({
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      ...(last ? {} : { marginBottom: 8, borderBottom: "1px solid var(--color-cream-20)", paddingBottom: 6 }),
    }) as const;

  const doneBody = (
    <div className="modal-body">
      <div className="badge-success-card">
        <div className="badge-success-icon">✓</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-black)", margin: "0 0 4px 0" }}>
          {isGranted ? "Badge Granted!" : "Application Successfully Submitted!"}
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-black-60)", margin: "0 auto 16px auto", maxWidth: 440 }}>
          {isGranted ? (
            <>
              Your <strong>{meta.title}</strong> badge is actively displayed on your public storefront.
            </>
          ) : (
            <>
              Your application for the <strong>{meta.title}</strong> badge has been officially recorded and routed for
              quality council evaluation.
            </>
          )}
        </p>

        <div
          style={{
            background: "var(--bg-cream-tint)",
            border: "1px solid var(--color-cream)",
            borderRadius: "var(--radius-card)",
            padding: 16,
            maxWidth: 460,
            margin: "0 auto 18px auto",
            textAlign: "left",
          }}
        >
          <div style={row()}>
            <span style={{ fontSize: 12, color: "var(--color-black-60)" }}>Submission Timestamp</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{submittedAt}</span>
          </div>
          <div style={row()}>
            <span style={{ fontSize: 12, color: "var(--color-black-60)" }}>Evaluation Status</span>
            {isGranted ? (
              <span className="vob-badge vob-badge-red">✓ Badge Granted</span>
            ) : (
              <span className="vob-badge">Under Council Review</span>
            )}
          </div>
          <div style={row(true)}>
            <span style={{ fontSize: 12, color: "var(--color-black-60)" }}>Recognition</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{meta.badgeTag}</span>
          </div>
        </div>

        {!isGranted && (
          <div
            style={{
              background: "var(--color-cream-20)",
              borderRadius: "var(--radius-control)",
              padding: 12,
              maxWidth: 460,
              margin: "0 auto",
              fontSize: 12,
              color: "var(--color-black-80)",
              textAlign: "left",
              lineHeight: 1.5,
            }}
          >
            <strong>Next Steps:</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
              <li>Desk verification of FSSAI / operational history (24–48h).</li>
              <li>Onboarding concierge reaches out via WhatsApp for tasting session.</li>
              <li>Certified badge automatically published to your live customer storefront.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  const footer = done ? (
    <div className="modal-footer" style={{ justifyContent: "center", gap: 12 }}>
      <button type="button" className="btn-next" onClick={onClose}>
        Return to Onboarding →
      </button>
    </div>
  ) : (
    <div className="modal-footer">
      <button type="button" className="btn-back" onClick={onClose}>
        Cancel
      </button>
      <button type="button" className="btn-next" onClick={submit} disabled={!declared || submitting}>
        {submitting ? "Submitting..." : "Submit Badge Application ✓"}
      </button>
    </div>
  );

  return createPortal(
    <div className="vob">
      <div
        className="modal-backdrop open"
        id="modal-badge-application"
        role="dialog"
        aria-modal="true"
        aria-label={meta.title}
        onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal-sheet badge-application-sheet" style={{ maxWidth: 680 }}>
          {header}
          {done ? doneBody : formBody}
          {footer}
        </div>
      </div>
    </div>,
    document.body,
  );
}
