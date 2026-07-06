/**
 * EMI (instalment) plans for the balance left after the 10% booking advance.
 *
 * A guest locks a date by paying 10% up front; the remaining 90% can be split
 * into equal instalments. EMI opens up once the event is at least three months
 * out — a coarse, single-threshold rule that's easy to explain to a customer:
 *
 *   • under 3 months away → balance settled in one go (no EMI)
 *   • 3+ months away      → up to 3 or 6 EMIs
 *
 * This is "track only": we compute a dated schedule and record it on the order;
 * our team collects each instalment manually. Nothing here charges a card.
 */

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** One scheduled instalment of the balance. */
export interface EmiInstallment {
  /** 1-based position in the schedule. */
  index: number;
  /** When this instalment is due, as a `YYYY-MM-DD` string. */
  dueISO: string;
  /** Human-friendly due date, e.g. "12 Dec 2026". */
  dueLabel: string;
  /** Amount due for this instalment, in whole rupees. */
  amount: number;
}

/** A full EMI plan for one booking's balance. */
export interface EmiPlan {
  /** Number of instalments the balance is split across. */
  count: number;
  /** Total balance being financed (the 90% after advance), in whole rupees. */
  balance: number;
  /** The dated instalment schedule. */
  installments: EmiInstallment[];
}

/** Whole calendar months from `from` until a `YYYY-MM-DD` event date.
 *  A part-month (the event day-of-month is earlier than today's) rounds down,
 *  so eligibility never overstates the lead time. Clamped at 0. */
export function monthsUntil(eventISO: string, from: Date = new Date()): number {
  const [y, m, d] = eventISO.split("-").map(Number);
  if (!y || !m || !d) return 0;
  let months =
    (y - from.getFullYear()) * 12 + (m - 1 - from.getMonth());
  if (d < from.getDate()) months -= 1;
  return Math.max(0, months);
}

/** Which EMI counts are on offer for a given lead time, in months. `1` means a
 *  single balance payment (no real EMI) and is always available. The 3- and
 *  6-instalment plans both open at the same 3-month threshold. */
export function emiOptionsForMonths(months: number): number[] {
  if (months >= 3) return [1, 3, 6];
  return [1];
}

/** EMI counts on offer for an event date (convenience over the two helpers). */
export function emiOptionsForEvent(
  eventISO: string,
  from: Date = new Date(),
): number[] {
  return emiOptionsForMonths(monthsUntil(eventISO, from));
}

/** True when the event is far enough out for a real multi-instalment plan. */
export function emiAvailable(eventISO: string, from: Date = new Date()): boolean {
  return emiOptionsForEvent(eventISO, from).length > 1;
}

/** `YYYY-MM-DD` → e.g. "12 Dec 2026". */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Add `days` to a date and return it as a `YYYY-MM-DD` string. */
function addDaysISO(from: Date, days: number): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Build the EMI schedule for a `balance` split into `count` equal instalments,
 * spread evenly between the booking date (`from`) and the event date — the last
 * instalment falling on the event date itself.
 *
 * Amounts divide as evenly as whole rupees allow; any rounding remainder lands
 * on the final instalment so the schedule always sums back to `balance`.
 */
export function buildEmiPlan(
  balance: number,
  count: number,
  eventISO: string,
  from: Date = new Date(),
): EmiPlan {
  const total = Math.max(0, Math.round(balance));
  const n = Math.max(1, Math.round(count));

  // Even split with the remainder on the last instalment.
  const per = Math.floor(total / n);

  // Days from booking to event; clamp so a same-day/past date still spaces out.
  const [y, m, d] = eventISO.split("-").map(Number);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const target =
    y && m && d ? new Date(y, m - 1, d) : new Date(today.getTime());
  const windowDays = Math.max(n, Math.round((target.getTime() - today.getTime()) / 86_400_000));

  const installments: EmiInstallment[] = [];
  for (let i = 1; i <= n; i++) {
    const amount = i === n ? total - per * (n - 1) : per;
    const dueISO = addDaysISO(today, Math.round((i * windowDays) / n));
    installments.push({ index: i, dueISO, dueLabel: formatDate(dueISO), amount });
  }

  return { count: n, balance: total, installments };
}

/** A compact, plain-text rendering of a plan for receipts / WhatsApp messages. */
export function formatEmiPlanText(plan: EmiPlan): string {
  const head = `Balance ₹${plan.balance.toLocaleString("en-IN")} in ${plan.count} EMI${plan.count > 1 ? "s" : ""}:`;
  const rows = plan.installments.map(
    (it) =>
      `  ${it.index}. ${it.dueLabel} — ₹${it.amount.toLocaleString("en-IN")}`,
  );
  return [head, ...rows].join("\n");
}
