"use client";

import { FlowFooter } from "../../ui";

interface BuilderNavProps {
  onBack: () => void;
  onContinue: () => void;
  /** Kept for API compatibility — drafts now save on every Continue. */
  onSaveDraft?: () => void;
  saving?: boolean;
  canContinue?: boolean;
  continueLabel?: string;
  backLabel?: string;
  mContinueLabel?: string;
  mBackLabel?: string;
  isFirstSection?: boolean;
}

/** Handover footer: "← Back" / "Continue →", fixed to the bottom on mobile. */
export default function BuilderNav({
  onBack,
  onContinue,
  saving = false,
  canContinue = true,
  continueLabel = "Continue →",
  backLabel = "← Back",
  mContinueLabel,
  mBackLabel,
}: BuilderNavProps) {
  return (
    <FlowFooter
      onBack={onBack}
      onContinue={canContinue ? onContinue : undefined}
      backLabel={backLabel}
      continueLabel={continueLabel}
      mBackLabel={mBackLabel}
      mContinueLabel={mContinueLabel}
      saving={saving}
    />
  );
}
