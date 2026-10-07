/**
 * Browser-side draft for the vendor onboarding wizard, keyed by account email.
 *
 * The catalog record (PUT /api/vendor/menu) already persists everything a
 * customer sees; this keeps the rest — where the vendor is in the flow, the
 * contact number from signup and the KYC fields that only reach the server on
 * final Submit — so a refresh resumes instead of restarting at Step 1.
 */

const KEY = "bhojpatra.vendor-onboarding.v2";

export interface OnboardingDraft {
  step?: number;
  branchIndex?: number;
  maxPhase?: number;
  catSection?: string;
  stallSection?: string;
  bainaSection?: string;
  phone?: string;
  gstNumber?: string;
  fssaiNumber?: string;
  documents?: Record<string, { fileName: string; status: "done"; id: string }>;
}

const keyFor = (email: string) => `${KEY}:${email.trim().toLowerCase()}`;

export function readDraft(email: string | undefined): OnboardingDraft {
  if (!email) return {};
  try {
    const raw = window.localStorage.getItem(keyFor(email));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as OnboardingDraft) : {};
  } catch {
    return {};
  }
}

export function writeDraft(email: string | undefined, patch: OnboardingDraft): void {
  if (!email) return;
  try {
    window.localStorage.setItem(keyFor(email), JSON.stringify({ ...readDraft(email), ...patch }));
  } catch {
    // Storage blocked (private mode etc.) — the wizard still works, just without resume.
  }
}
