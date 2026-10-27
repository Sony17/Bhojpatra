/* ─── Single Stall booking notice ─────────────────────────────────────────
 * How far ahead a customer must book a vendor's Single Stall — the vendor's
 * own choice (Vendor Portal → Calendar), down to same day. When a vendor has
 * set it, it replaces the platform's default vendor lead and the admin's
 * occasion lead (Settings → Occasions, default 7 days) for their stall; a
 * vendor who never set it keeps exactly the old behaviour. Same-day orders
 * close at the vendor's cut-off time (IST) on the day itself.
 *
 * Pure, so the stall wizard and the booking POST apply the identical rule.
 */

export const STALL_NOTICE_OPTIONS: { days: number; label: string }[] = [
  { days: 0, label: "Same day" },
  { days: 1, label: "Next day (1 day notice)" },
  { days: 2, label: "2 days notice" },
  { days: 3, label: "3 days notice" },
  { days: 7, label: "7 days notice" },
];

export const DEFAULT_SAME_DAY_CUTOFF = "12:00";

/** Cut-off times a vendor can pick for same-day orders (IST). */
export const SAME_DAY_CUTOFFS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The vendor's notice as stored, or null when the input isn't a valid one. */
export function cleanStallNotice(
  days: unknown,
  cutoff: unknown,
): { stallNoticeDays: number; sameDayCutoff?: string } | null {
  const d = typeof days === "number" ? days : Number(days);
  if (!STALL_NOTICE_OPTIONS.some((o) => o.days === d)) return null;
  if (d !== 0) return { stallNoticeDays: d };
  const c =
    typeof cutoff === "string" && SAME_DAY_CUTOFFS.includes(cutoff)
      ? cutoff
      : DEFAULT_SAME_DAY_CUTOFF;
  return { stallNoticeDays: 0, sameDayCutoff: c };
}

/** The current IST clock time as "HH:MM". */
export function istNowHHMM(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(11, 16);
}

/** "13:00" → "1:00 PM". */
export function formatCutoff(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export type NoticeProblem =
  | { kind: "days"; days: number }
  | { kind: "cutoff"; cutoff: string };

/**
 * Does an event `daysUntil` IST calendar days away break the vendor's notice?
 * Null when it doesn't — or when the vendor never set a notice (the platform
 * default then applies elsewhere, as before).
 */
export function stallNoticeProblem(
  rule: { noticeDays?: number; cutoff?: string },
  daysUntil: number | null,
  now: Date = new Date(),
): NoticeProblem | null {
  if (rule.noticeDays == null || daysUntil == null) return null;
  if (daysUntil < rule.noticeDays) return { kind: "days", days: rule.noticeDays };
  if (rule.noticeDays === 0 && daysUntil === 0) {
    const cutoff = rule.cutoff ?? DEFAULT_SAME_DAY_CUTOFF;
    if (istNowHHMM(now) >= cutoff) return { kind: "cutoff", cutoff };
  }
  return null;
}
