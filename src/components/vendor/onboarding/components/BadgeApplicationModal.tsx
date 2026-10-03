"use client";

import { useState } from "react";
import type { RecognitionBadgeKey, VendorBadgesState } from "@/lib/vendorMenus";
import { BtnBack, BtnNext, FormLabel, Sheet, inputCls } from "../ui";

interface BadgeMeta {
  key: RecognitionBadgeKey;
  title: string;
  icon: string;
  badgeTag: string;
  description: string;
  criteriaList: { id: string; label: string; desc: string }[];
}

const c = (id: string, label: string, desc: string) => ({ id, label, desc });

/** Handover badge configs (Verified / City Icon / Heritage Caterer). */
export const BADGE_DEFINITIONS: Record<RecognitionBadgeKey, BadgeMeta> = {
  verified: {
    key: "verified",
    title: "Verified Caterer",
    icon: "🛡️",
    badgeTag: "Entry-Level Recognition",
    description: "Entry-level recognition for vendors meeting Bhojpatra's core quality and operational standards.",
    criteriaList: [
      c("fssai", "Valid FSSAI", "Active Food Safety and Standards Authority of India licence."),
      c("gst", "GST where applicable", "Valid GSTIN registration based on statutory turnover thresholds."),
      c("pan_bank", "PAN + business/bank details", "Verified commercial PAN and active business bank account for payouts."),
      c("experience_2y", "Minimum 2 years operating experience", "Demonstrated commercial track record in food service or catering."),
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
    description:
      "Our most exclusive recognition for caterers with a long-standing culinary legacy and generational heritage.",
    criteriaList: [
      c("legacy_15y", "Minimum 15 years continuous legacy", "Demonstrable decade-and-a-half or greater operational presence."),
      c("family_run", "Preferably family-run/legacy food business", "Traditional family ownership passed through generations."),
      c("tradition", "Strong connection with local culinary tradition", "Rooted in authentic regional cuisine and culinary heritage."),
      c("generations", "Multiple generations involved OR demonstrable long-standing legacy", "Lineage of master cooks or a long-standing documented legacy."),
      c("local_reputation", "Recognised local reputation", "Revered culinary standing within the community."),
      c("traditional_dishes", "Signature/traditional dishes", "Celebrated recipes preserved through traditional preparation methods."),
      c("consistency", "Consistent quality over the years", "Uncompromising taste standards maintained across decades."),
      c("history_refs", "Strong historical/customer references", "Generations of patron families and archival proof of legacy."),
      c("verification", "Bhojpatra tasting + verification process pass", "Curated historical evaluation and signature dish tasting clearance."),
    ],
  },
};

interface BadgeApplicationModalProps {
  badgeKey: RecognitionBadgeKey | null;
  badgesState: VendorBadgesState;
  onClose: () => void;
  onSuccess: (updatedState: VendorBadgesState) => void;
}

export default function BadgeApplicationModal({ badgeKey, badgesState, onClose, onSuccess }: BadgeApplicationModalProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [story, setStory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const meta = badgeKey ? BADGE_DEFINITIONS[badgeKey] : null;
  const isGranted = badgeKey ? badgesState.granted?.includes(badgeKey) : false;
  const isApplied = badgeKey ? badgesState.applied?.includes(badgeKey) : false;

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
      if (data.badges) {
        onSuccess(data.badges);
        onClose();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!meta) return null;
  const editable = !isGranted && !isApplied;

  return (
    <Sheet
      open={Boolean(badgeKey)}
      onClose={onClose}
      eyebrow={meta.badgeTag}
      title={`${meta.icon} ${meta.title}`}
      wide
      footer={
        editable ? (
          <>
            <BtnBack onClick={onClose}>Cancel</BtnBack>
            <BtnNext onClick={submit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Application"}
            </BtnNext>
          </>
        ) : (
          <BtnBack onClick={onClose}>Close</BtnBack>
        )
      }
    >
      <p className="text-[13px] text-ink/70">{meta.description}</p>

      {isGranted ? (
        <div className="mt-4 rounded-control border border-maroon/30 bg-maroon/5 p-4 text-sm text-ink">
          <strong className="text-maroon">✓ Badge Granted!</strong> This badge is actively displayed on your public
          storefront.
        </div>
      ) : isApplied ? (
        <div className="mt-4 rounded-control border border-cream bg-cream/20 p-4 text-sm text-ink">
          <strong>✓ Application Submitted · Applied</strong>
          <p className="mt-1 text-xs text-ink/70">
            Your application was received by Bhojpatra&apos;s curation team. Badges are granted upon verification.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink/60">Requirements</div>
            <div className="space-y-2">
              {meta.criteriaList.map((it) => (
                <label
                  key={it.id}
                  className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border border-cream/70 bg-white p-2.5"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(checked[it.id])}
                    onChange={() => setChecked((p) => ({ ...p, [it.id]: !p[it.id] }))}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-[#b92025]"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-ink">{it.label}</span>
                    <span className="block text-[11px] text-ink/60">{it.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <FormLabel htmlFor="badge-notes">Tell us about your culinary credentials (Optional)</FormLabel>
            <textarea
              id="badge-notes"
              rows={3}
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="Share kitchen details, culinary awards, history or specialty items..."
              className={inputCls}
            />
          </div>
          {error && <p className="text-xs font-semibold text-maroon">⚠️ {error}</p>}
        </div>
      )}
    </Sheet>
  );
}
