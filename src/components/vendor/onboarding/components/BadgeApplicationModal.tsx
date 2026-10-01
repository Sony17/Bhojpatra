"use client";

import { useState } from "react";
import type { RecognitionBadgeKey, VendorBadgesState } from "@/lib/vendorMenus";
import { Button } from "@/components/ui";

interface BadgeMeta {
  key: RecognitionBadgeKey;
  title: string;
  hindiTitle: string;
  icon: string;
  badgeTag: string;
  description: string;
  criteriaList: { id: string; label: string }[];
}

export const BADGE_DEFINITIONS: Record<RecognitionBadgeKey, BadgeMeta> = {
  verified: {
    key: "verified",
    title: "Verified Caterer",
    hindiTitle: "सत्यापित कैटरर",
    icon: "🛡️",
    badgeTag: "Bhojpatra Verified",
    description:
      "Awarded to caterers with verified commercial kitchen infrastructure, valid FSSAI license, and proven hygiene standards.",
    criteriaList: [
      { id: "fssai_valid", label: "Holds an active, verifiable FSSAI license" },
      { id: "kitchen_infra", label: "Commercial kitchen premises available for random audit" },
      { id: "hygiene_protocols", label: "Adheres to standardized food safety and storage protocols" },
      { id: "staff_uniform", label: "Trained service crew and staff with uniform hygiene gear" },
    ],
  },
  icon: {
    key: "icon",
    title: "City Culinary Icon",
    hindiTitle: "शहर का प्रतिष्ठित स्वाद",
    icon: "⭐",
    badgeTag: "Culinary Icon",
    description:
      "Reserved for marquee caterers and hallmark culinary brands renowned for signature feasts across their region.",
    criteriaList: [
      { id: "operating_years", label: "Continuous catering operations for 5+ years" },
      { id: "signature_dishes", label: "Recognized for signature Awadhi/regional recipes" },
      { id: "large_events", label: "Experience serving grand events with 500+ guests" },
      { id: "client_satisfaction", label: "Consistently high customer feedback and local reputation" },
    ],
  },
  heritage: {
    key: "heritage",
    title: "Heritage Specialist",
    hindiTitle: "विरासत विशेषज्ञ",
    icon: "🏛️",
    badgeTag: "Heritage Kitchen",
    description:
      "Honors multi-generational bawarchis, heirloom sweet makers, and authentic royal dawat custodians.",
    criteriaList: [
      { id: "heirloom_lineage", label: "Traditional culinary lineage or heirloom family recipe secrets" },
      { id: "authentic_techniques", label: "Uses traditional preparation methods (dum, sigri, copper handi)" },
      { id: "culinary_preservation", label: "Committed to preserving authentic regional recipes and presentation" },
    ],
  },
};

interface BadgeApplicationModalProps {
  badgeKey: RecognitionBadgeKey | null;
  badgesState: VendorBadgesState;
  onClose: () => void;
  onSuccess: (updatedState: VendorBadgesState) => void;
}

export default function BadgeApplicationModal({
  badgeKey,
  badgesState,
  onClose,
  onSuccess,
}: BadgeApplicationModalProps) {
  const [checkedCriteria, setCheckedCriteria] = useState<Record<string, boolean>>({});
  const [story, setStory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!badgeKey) return null;
  const meta = BADGE_DEFINITIONS[badgeKey];
  if (!meta) return null;

  const isGranted = badgesState.granted?.includes(badgeKey);
  const isApplied = badgesState.applied?.includes(badgeKey);

  const toggleCheck = (id: string) => {
    setCheckedCriteria((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/vendor/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          badgeKey,
          criteria: checkedCriteria,
          details: story.trim() ? { notes: story.trim() } : undefined,
        }),
      });

      const data = await res.json();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-card bg-cream p-6 shadow-xl border border-cream-3 sm:p-7 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-cream-2 hover:text-ink transition-colors"
          aria-label="Close modal"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-ink">{meta.title}</h3>
            <p className="text-xs text-ink-soft">{meta.hindiTitle} · {meta.badgeTag}</p>
          </div>
        </div>

        <p className="mt-3 text-xs sm:text-sm text-ink-soft leading-relaxed">
          {meta.description}
        </p>

        {isGranted ? (
          <div className="mt-5 rounded-control bg-emerald-50 border border-emerald-300 p-4 text-emerald-800 text-sm">
            <span className="font-semibold">✓ Badge Granted!</span> This badge is actively displayed on your public storefront and customer quote cards.
          </div>
        ) : isApplied ? (
          <div className="mt-5 rounded-control bg-amber-50 border border-amber-300 p-4 text-amber-800 text-sm">
            <span className="font-semibold">⏳ Application Under Review</span>
            <p className="mt-1 text-xs">
              Your application was received by Bhojpatra&apos;s culinary curation team. Badges are granted upon verification of kitchen standards and documentation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <p className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                Self-Attestation Criteria
              </p>
              <div className="space-y-2">
                {meta.criteriaList.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-control border border-cream-3 bg-white/60 p-2.5 text-xs text-ink cursor-pointer hover:bg-white transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(checkedCriteria[item.id])}
                      onChange={() => toggleCheck(item.id)}
                      className="mt-0.5 h-4 w-4 rounded-sm border-cream-4 text-maroon focus:ring-maroon"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Tell us about your culinary credentials (Optional)
              </label>
              <textarea
                rows={3}
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Share kitchen details, culinary awards, history or specialty items..."
                className="w-full rounded-control border border-cream-3 bg-white/70 p-2.5 text-xs text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
              />
            </div>

            <div className="rounded-control bg-cream-2/70 p-3 text-[11px] text-ink-soft leading-normal">
              ℹ️ <strong>Review Policy:</strong> Badge applications are audited by Bhojpatra curators. Submitting an application does not automatically grant the badge.
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
