"use client";

import { Button } from "@/components/ui";

interface BuilderNavProps {
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
  canContinue?: boolean;
  continueLabel?: string;
  backLabel?: string;
  isFirstSection?: boolean;
}

export default function BuilderNav({
  onBack,
  onContinue,
  onSaveDraft,
  saving = false,
  canContinue = true,
  continueLabel = "Save & Continue →",
  backLabel = "← Back",
  isFirstSection = false,
}: BuilderNavProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-cream-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onBack}
          disabled={saving}
          className="w-full sm:w-auto min-h-[44px]"
        >
          {isFirstSection ? "← Back to Offerings" : backLabel}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSaveDraft && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onSaveDraft}
            disabled={saving}
            className="w-full sm:w-auto min-h-[44px] text-ink-soft hover:text-ink"
          >
            {saving ? "Saving..." : "Save Draft"}
          </Button>
        )}
        <Button
          type="button"
          size="md"
          onClick={onContinue}
          disabled={!canContinue || saving}
          className="w-full sm:w-auto min-h-[44px] min-w-[150px]"
        >
          {saving ? (
            <div className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Saving...</span>
            </div>
          ) : (
            continueLabel
          )}
        </Button>
      </div>
    </div>
  );
}
