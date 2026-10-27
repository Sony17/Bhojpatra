"use client";

/**
 * Payout dialog, shared by the period settlements and the vendor advances.
 * Two ways to pay:
 *   • Send now via RazorpayX (when configured) — the server pays the vendor's
 *     VERIFIED bank account (IMPS / NEFT) or UPI ID from the RazorpayX balance;
 *   • Record a payment already made outside the app, with its payout id / UTR.
 * `amountEditable` lets the admin adjust a suggested advance before recording.
 * Callers mount it per row (keyed) so each payout starts with a fresh form.
 */

import { useState } from "react";
import Modal from "@/components/admin/shared/Modal";
import { money } from "@/components/admin/shared/money";
import { Button, Field, Input, cn } from "@/components/ui";
import { VENDOR_PAYOUT_METHODS, type VendorPayoutMethod } from "@/lib/vendorAdvance";
import type { VendorPayee } from "@/lib/admin/types";

export interface PayoutDetails {
  amount: number;
  method: VendorPayoutMethod;
  reference: string;
  /** Send through RazorpayX now (vs record a past payment). */
  send?: boolean;
  target?: "bank" | "upi";
}

interface PayoutModalProps {
  open: boolean;
  title: string;
  /** One line about who/what is being paid, e.g. "Annapurna Caterers · Nov 2026". */
  subtitle: string;
  /** The vendor's bank / UPI from onboarding, when they've given one. */
  payee?: VendorPayee;
  /** RazorpayX payouts are configured on the server. */
  payoutsEnabled?: boolean;
  /** The last RazorpayX attempt's failure, shown so the admin can retry. */
  lastFailure?: string;
  amount: number;
  amountEditable?: boolean;
  /** Upper bound for an editable amount (the booking value). */
  maxAmount?: number;
  /** Shown under the amount, e.g. a warning that it exceeds what's collected. */
  amountHint?: (amount: number) => string | undefined;
  submitLabel: string;
  onClose: () => void;
  /** Resolve to an error message to keep the dialog open, or null on success. */
  onSubmit: (details: PayoutDetails) => Promise<string | null>;
}

export default function PayoutModal({
  open,
  title,
  subtitle,
  payee,
  payoutsEnabled,
  lastFailure,
  amount: initialAmount,
  amountEditable,
  maxAmount,
  amountHint,
  submitLabel,
  onClose,
  onSubmit,
}: PayoutModalProps) {
  const canBank = Boolean(payee?.bankVerified && payee.accountNumber && payee.ifsc);
  const canUpi = Boolean(payee?.upiVerified && payee.upiId);
  const [send, setSend] = useState(Boolean(payoutsEnabled && (canBank || canUpi)));
  const [target, setTarget] = useState<"bank" | "upi">(canBank || !canUpi ? "bank" : "upi");
  const [amount, setAmount] = useState(String(initialAmount));
  const [method, setMethod] = useState<VendorPayoutMethod>("Razorpay");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const value = Math.round(Number(amount));
  const needsRef = !send && method !== "Cash";

  const submit = async () => {
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter an amount above ₹0.");
      return;
    }
    if (maxAmount != null && value > maxAmount) {
      setError(`The amount can't exceed ${money(maxAmount)}.`);
      return;
    }
    if (needsRef && !reference.trim()) {
      setError(
        method === "Razorpay"
          ? "Enter the Razorpay payout ID (e.g. pout_…)."
          : "Enter the UTR / transaction reference.",
      );
      return;
    }
    if (send && !(target === "bank" ? canBank : canUpi)) {
      setError(
        `The vendor's ${target === "bank" ? "bank account" : "UPI ID"} isn't verified yet — verify it in Vendor Approvals.`,
      );
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSubmit({
      amount: value,
      method: send ? "Razorpay" : method,
      reference: reference.trim(),
      ...(send ? { send: true, target } : {}),
    });
    setSaving(false);
    if (err) setError(err);
  };

  const hint = amountHint?.(value);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={submit} disabled={saving}>
            {saving
              ? send
                ? "Sending…"
                : "Saving…"
              : send
                ? `Send ${money(Number.isFinite(value) && value > 0 ? value : 0)} via RazorpayX`
                : submitLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-ink-soft">{subtitle}</p>

        <PayeeCard payee={payee} />

        {lastFailure && (
          <p className="rounded-card border border-maroon px-4 py-2.5 text-sm text-maroon">
            Last Razorpay attempt failed: {lastFailure}. You can retry below.
          </p>
        )}

        {payoutsEnabled && (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="How to pay">
            {[
              { v: true, label: "Send now via RazorpayX" },
              { v: false, label: "Record a payment I made" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={send === o.v}
                onClick={() => setSend(o.v)}
                className={cn(
                  "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                  send === o.v ? "bg-maroon text-cream" : "bg-cream-2 text-ink-soft hover:bg-cream-3",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {amountEditable ? (
          <Field label={send ? "Amount to send (₹)" : "Amount paid (₹)"} hint={hint} required>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
        ) : (
          <div>
            <p className="text-caption font-semibold text-ink">Amount</p>
            <p className="font-display text-2xl text-ink">{money(initialAmount)}</p>
          </div>
        )}

        {send ? (
          <div>
            <p className="mb-1.5 text-caption font-semibold text-ink">Send to</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Send to">
              {(
                [
                  { v: "bank", label: "Bank account (IMPS / NEFT)", ok: canBank },
                  { v: "upi", label: "UPI ID", ok: canUpi },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={target === o.v}
                  disabled={!o.ok}
                  onClick={() => setTarget(o.v)}
                  className={cn(
                    "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    target === o.v ? "bg-maroon text-cream" : "bg-cream-2 text-ink-soft hover:bg-cream-3",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-caption text-ink-soft">
              {canBank || canUpi
                ? "Money leaves your RazorpayX balance straight away. If the balance is short it waits in RazorpayX until you top up."
                : "Only admin-verified bank / UPI details can be paid. Verify them in Vendor Approvals first."}
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-1.5 text-caption font-semibold text-ink">Paid via</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Paid via">
              {VENDOR_PAYOUT_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={method === m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "focus-ring rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    method === m
                      ? "bg-maroon text-cream"
                      : "bg-cream-2 text-ink-soft hover:bg-cream-3",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {needsRef && (
          <Field
            label={method === "Razorpay" ? "Razorpay payout ID" : "UTR / reference"}
            hint={
              method === "Razorpay"
                ? "From the Razorpay dashboard → Payouts after you send the transfer."
                : "The bank / UPI transaction reference for this transfer."
            }
            required
          >
            <Input
              value={reference}
              maxLength={120}
              placeholder={method === "Razorpay" ? "pout_…" : "e.g. 4290 1234 5678"}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>
        )}

        {error && <p className="text-sm font-medium text-maroon">{error}</p>}
      </div>
    </Modal>
  );
}

/** Where to send the money — the vendor's bank / UPI from onboarding. */
function PayeeCard({ payee }: { payee?: VendorPayee }) {
  const bank: [string, string | undefined][] = [
    ["Account holder", payee?.holderName],
    ["Account number", payee?.accountNumber],
    ["IFSC", payee?.ifsc],
    ["Bank", [payee?.bankName, payee?.branch].filter(Boolean).join(" · ") || undefined],
    ["Account type", payee?.accountType],
  ];
  const hasBank = Boolean(payee?.accountNumber || payee?.ifsc);
  const hasUpi = Boolean(payee?.upiId || payee?.upiQrUrl);
  if (!payee || (!hasBank && !hasUpi)) {
    return (
      <p className="rounded-card border border-maroon px-4 py-3 text-sm text-maroon">
        This vendor hasn&apos;t added a bank account or UPI yet. Ask them to add one in onboarding
        (Statutory KYC step) before paying.
      </p>
    );
  }
  return (
    <div className="space-y-3 rounded-card border border-cream-3 bg-cream/40 px-4 py-3">
      {hasBank && (
        <PayeeSection title="Bank account" verified={payee.bankVerified}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
            {bank
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="select-all break-all tabular-nums text-ink">{v}</dd>
                </div>
              ))}
          </dl>
        </PayeeSection>
      )}
      {hasUpi && (
        <PayeeSection title="UPI" verified={payee.upiVerified}>
          {payee.upiId && <p className="select-all break-all text-sm text-ink">{payee.upiId}</p>}
          {payee.upiQrUrl && (
            <a
              href={payee.upiQrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-block text-sm font-semibold text-maroon hover:underline"
            >
              View UPI QR code ↗
            </a>
          )}
        </PayeeSection>
      )}
    </div>
  );
}

function PayeeSection({
  title,
  verified,
  children,
}: {
  title: string;
  verified: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-caption font-semibold text-ink">Pay to · {title}</p>
        <span className={cn("text-xs font-semibold", verified ? "text-ink" : "text-maroon")}>
          {verified ? "✓ Verified by admin" : "Not verified yet"}
        </span>
      </div>
      {children}
    </div>
  );
}
