/**
 * Vendor payouts through RazorpayX — money OUT of Bhojpatra's RazorpayX
 * account (topped up from the admin bank account) into a caterer's bank
 * account (IMPS / NEFT) or UPI ID.
 *
 * Flow, for an advance (`ADV-…`) or a period settlement (`STL-…`):
 *   1. resolve the vendor's VERIFIED bank / UPI from their application;
 *   2. reuse (or create once) a RazorpayX contact + fund account for it —
 *      cached as `RZPFA-<hash>` rows in the `settlements` table;
 *   3. create the payout with an idempotency key (`<ref>-<attempt>`) so a
 *      retried request never pays twice;
 *   4. store it as Processing; the payouts webhook — or a re-sync whenever the
 *      admin opens Settlements — moves it to Paid (with the bank UTR) or
 *      Failed, which frees the row for a retry.
 *
 * Server-only (holds the API keypair via `@/lib/razorpay`).
 */
import { createHash } from "crypto";
import { createStore } from "@/lib/store";
import {
  createRazorpayXContact,
  createRazorpayXFundAccount,
  createRazorpayXPayout,
  fetchRazorpayXPayout,
  type RazorpayXPayout,
  type RazorpayXPayoutMode,
} from "@/lib/razorpay";
import {
  settlementStore,
  vendorAdvanceStore,
  type RazorpayXState,
} from "@/lib/settlements";
import { readVendorApplications } from "@/lib/vendorApplications";

export type PayoutTarget = "bank" | "upi";

interface StoredFundAccount {
  /** `RZPFA-<hash of the destination>`. */
  id: string;
  kind: "fundAccount";
  contactId: string;
  fundAccountId: string;
  createdAt: string;
}

const fundAccountStore = createStore<StoredFundAccount>({
  table: "settlements",
  idField: "id",
});

/** IMPS is instant up to ₹5 lakh; larger bank transfers go NEFT. */
const IMPS_LIMIT = 500_000;

/** Razorpay payout status → ours. Anything not final is still Processing. */
export function payoutStatusOf(raw: string): RazorpayXState["status"] {
  if (raw === "processed") return "Paid";
  if (["reversed", "cancelled", "rejected", "failed"].includes(raw)) return "Failed";
  return "Processing";
}

function stateFrom(p: RazorpayXPayout, attempt: number): RazorpayXState {
  const status = payoutStatusOf(p.status);
  const reason = p.failure_reason || p.status_details?.description || undefined;
  return {
    payoutId: p.id,
    status,
    rawStatus: p.status,
    mode: p.mode ?? "",
    attempt,
    updatedAt: new Date().toISOString(),
    ...(p.utr ? { utr: p.utr } : {}),
    ...(status === "Failed" ? { failureReason: reason || `Payout ${p.status}` } : {}),
  };
}

/**
 * The vendor's verified destination for this target, plus who they are (for
 * the RazorpayX contact). Matched by business name — bookings carry the
 * vendor's display name. Errors read as admin-facing messages.
 */
async function destinationFor(
  vendor: string,
  target: PayoutTarget,
): Promise<
  | {
      ok: true;
      name: string;
      email?: string;
      phone?: string;
      account:
        | { kind: "bank"; name: string; ifsc: string; accountNumber: string }
        | { kind: "upi"; vpa: string };
    }
  | { ok: false; error: string }
> {
  const key = vendor.trim().toLowerCase();
  const app = (await readVendorApplications())
    .filter((a) => a.business.trim().toLowerCase() === key && a.payoutAccount)
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))[0];
  const acct = app?.payoutAccount;
  if (!app || !acct) return { ok: false, error: "This vendor hasn't added payout details." };

  const verified = (kind: string) =>
    app.documents.find((d) => d.kind === kind)?.status === "Verified";
  const who = { name: app.business, email: app.email || undefined, phone: app.phone || undefined };

  if (target === "upi") {
    if (!acct.upiId) return { ok: false, error: "This vendor has no UPI ID on file (a QR alone can't be paid by API)." };
    if (!verified("UPI")) return { ok: false, error: "Verify the vendor's UPI in Vendor Approvals first." };
    return { ok: true, ...who, account: { kind: "upi", vpa: acct.upiId } };
  }
  if (!acct.accountNumber || !acct.ifsc) {
    return { ok: false, error: "This vendor's bank account number or IFSC is missing." };
  }
  if (!verified("Bank Account")) {
    return { ok: false, error: "Verify the vendor's bank account in Vendor Approvals first." };
  }
  return {
    ok: true,
    ...who,
    account: {
      kind: "bank",
      name: acct.holderName || app.business,
      ifsc: acct.ifsc,
      accountNumber: acct.accountNumber,
    },
  };
}

/** Reuse the RazorpayX fund account for this exact destination, or create
 *  the contact + fund account once. */
async function fundAccountFor(
  dest: Extract<Awaited<ReturnType<typeof destinationFor>>, { ok: true }>,
): Promise<string> {
  const fingerprint =
    dest.account.kind === "bank"
      ? `bank:${dest.account.ifsc}:${dest.account.accountNumber}`
      : `upi:${dest.account.vpa.toLowerCase()}`;
  const id = `RZPFA-${createHash("sha256").update(fingerprint).digest("hex").slice(0, 24)}`;
  const cached = await fundAccountStore.get(id).catch(() => null);
  if (cached?.kind === "fundAccount") return cached.fundAccountId;

  const contact = await createRazorpayXContact({
    name: dest.name,
    email: dest.email,
    phone: dest.phone,
    referenceId: id,
  });
  const fa = await createRazorpayXFundAccount(contact.id, dest.account);
  await fundAccountStore.upsert({
    id,
    kind: "fundAccount",
    contactId: contact.id,
    fundAccountId: fa.id,
    createdAt: new Date().toISOString(),
  });
  return fa.id;
}

/**
 * Send one payout. `ref` is the advance / settlement id it pays, `attempt`
 * the retry count (1 on first send). Returns the state to store on the
 * record, or an error message for the admin.
 */
export async function sendVendorPayout(opts: {
  ref: string;
  attempt: number;
  vendor: string;
  amount: number;
  target: PayoutTarget;
  narration: string;
}): Promise<{ ok: true; state: RazorpayXState } | { ok: false; error: string }> {
  const dest = await destinationFor(opts.vendor, opts.target);
  if (!dest.ok) return dest;
  const mode: RazorpayXPayoutMode =
    dest.account.kind === "upi" ? "UPI" : opts.amount <= IMPS_LIMIT ? "IMPS" : "NEFT";
  try {
    const fundAccountId = await fundAccountFor(dest);
    const payout = await createRazorpayXPayout({
      fundAccountId,
      amountRupees: opts.amount,
      mode,
      referenceId: opts.ref,
      narration: opts.narration,
      idempotencyKey: `${opts.ref}-${opts.attempt}`,
      notes: { ref: opts.ref },
    });
    return { ok: true, state: stateFrom(payout, opts.attempt) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Razorpay payout failed.",
    };
  }
}

/** Apply a payout's latest state to the advance / settlement it pays (by our
 *  ref). Returns the ref when something was updated. Used by the webhook and
 *  by {@link syncProcessingPayouts}. */
export async function applyPayoutUpdate(ref: string, payout: RazorpayXPayout): Promise<string | null> {
  // Both record kinds live in the `settlements` table; either store reads it.
  if (!ref.startsWith("ADV-") && !ref.startsWith("STL-")) return null;
  const record = await vendorAdvanceStore.get(ref);
  // Only the payout this record is waiting on — never a superseded attempt.
  if (!record?.razorpayX || record.razorpayX.payoutId !== payout.id) return null;
  const next = stateFrom(payout, record.razorpayX.attempt);
  if (next.rawStatus === record.razorpayX.rawStatus && next.utr === record.razorpayX.utr) return null;
  await vendorAdvanceStore.upsert({ ...record, razorpayX: next });
  return ref;
}

/** Pull fresh status for payouts still Processing (at most `limit`), so the
 *  console stays right even when the webhook can't reach this server (e.g.
 *  localhost). Best-effort: failures leave the row as it was. */
export async function syncProcessingPayouts(limit = 20): Promise<void> {
  let rows: { id: string; razorpayX?: RazorpayXState }[] = [];
  try {
    rows = (await settlementStore.list()).filter((r) => r.razorpayX?.status === "Processing");
  } catch {
    return;
  }
  for (const r of rows.slice(0, limit)) {
    try {
      await applyPayoutUpdate(r.id, await fetchRazorpayXPayout(r.razorpayX!.payoutId));
    } catch (err) {
      console.error("RazorpayX payout sync failed", r.id, err);
    }
  }
}
