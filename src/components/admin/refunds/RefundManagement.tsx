"use client";

/**
 * Refund Management — refund requests against bookings and their lifecycle:
 * Requested → Approved → Processed (or Declined at either step). Distinct from
 * the Payments ledger, which only records the raw money movement a processed
 * refund eventually produces.
 */

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import Modal from "@/components/admin/shared/Modal";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import { money } from "@/components/admin/shared/money";
import { Refund, Wallet, ShieldCheck } from "@/components/admin/shared/icons";
import { Button } from "@/components/ui";
import { queryRefunds } from "@/lib/admin/mockData";
import type { AdminRefund, RefundStatus } from "@/lib/admin/types";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Requested", value: "Requested" },
  { label: "Approved", value: "Approved" },
  { label: "Processed", value: "Processed" },
  { label: "Declined", value: "Declined" },
];

export default function RefundManagement() {
  // Only real, persisted refund requests — no demo rows, so the totals are
  // true money figures.
  const [rows, setRows] = useState<AdminRefund[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  // Detail-modal state for processing: the server's error (shown in place, not
  // a toast) and the UTR of a manual payout.
  const [actionError, setActionError] = useState("");
  const [utr, setUtr] = useState("");
  const [processing, setProcessing] = useState(false);
  const [byHand, setByHand] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/refunds", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const { refunds } = (await res.json()) as { refunds?: AdminRefund[] };
        if (cancelled) return;
        setRows(Array.isArray(refunds) ? refunds : []);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  const stats = useMemo(() => {
    const open = rows.filter((r) => r.status === "Requested" || r.status === "Approved");
    const processed = rows.filter((r) => r.status === "Processed" && !r.gatewayPending);
    return {
      open: open.length,
      pendingValue: open.reduce((s, r) => s + r.amount, 0),
      refunded: processed.reduce((s, r) => s + r.amount, 0),
    };
  }, [rows]);

  const result = useMemo(
    () => queryRefunds({ q, status: status as never, page, pageSize: PAGE_SIZE }, rows),
    [q, status, page, rows],
  );

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  const openRefund = (id: string | null) => {
    setSelectedId(id);
    setActionError("");
    setUtr("");
    setByHand(false);
  };

  // Paying a refund out moves real money, so it is never optimistic: wait for
  // the server and show exactly what it said if it refuses.
  const processRefund = async (r: AdminRefund) => {
    setProcessing(true);
    setActionError("");
    try {
      const res = await fetch(`/api/refunds/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Processed",
          ...(utr.trim() ? { payoutRef: utr.trim() } : {}),
          ...(byHand ? { skipGateway: true } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { refund?: AdminRefund; error?: string }
        | null;
      // A partial gateway success comes back with the updated row too.
      if (data?.refund) {
        const updated = data.refund;
        setRows((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
      }
      if (!res.ok || !data?.refund) {
        setActionError(data?.error ?? `Couldn't process the refund (error ${res.status}).`);
        return;
      }
      const refund = data.refund;
      setUtr("");
      setByHand(false);
      setToast(
        refund.gatewayRefunds?.length
          ? `Refund ${refund.id} sent through Razorpay${refund.payoutRef ? ` + UTR ${refund.payoutRef}` : ""}.`
          : `Refund ${refund.id} marked paid — UTR ${refund.payoutRef}.`,
      );
    } catch {
      setActionError("Couldn't reach the server. Nothing was changed — please try again.");
    } finally {
      setProcessing(false);
    }
  };

  // Optimistic status change. Live (persisted) rows are PATCHed and rolled back
  // if the server rejects the transition; demo seed rows update locally only.
  const setRefundStatus = (id: string, next: RefundStatus) => {
    const snapshot = rows;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: next,
              ...(next === "Processed" || next === "Declined"
                ? { processedAt: r.processedAt ?? r.requestedAt }
                : {}),
            }
          : r,
      ),
    );

    fetch(`/api/refunds/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as
          | { refund?: AdminRefund; error?: string }
          | null;
        if (!res.ok) throw new Error(data?.error ?? `error ${res.status}`);
        return data ?? {};
      })
      .then((data: { refund?: AdminRefund }) => {
        // Adopt the server's canonical row (it stamps the real processedAt).
        if (data?.refund) {
          setRows((prev) => prev.map((r) => (r.id === id ? data.refund! : r)));
        }
      })
      .catch((err: unknown) => {
        setRows(snapshot);
        setToast(
          `Couldn't save the refund: ${err instanceof Error ? err.message : "please try again"}`,
        );
      });
  };

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const columns: Column<AdminRefund>[] = [
    {
      key: "id",
      header: "Refund",
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.customer}</p>
          <p className="text-xs text-ink-soft">{r.id} · {r.bookingId}</p>
          <p className="truncate text-xs text-ink-soft">{r.reason}</p>
        </div>
      ),
    },
    { key: "method", header: "Method", cell: (r) => <span className="text-ink-soft">{r.method}</span> },
    { key: "requestedAt", header: "Requested", cell: (r) => <span className="text-ink-soft">{r.requestedAt}</span> },
    {
      key: "amount",
      header: "Amount",
      cell: (r) => <span className="font-display font-semibold text-ink">{money(r.amount)}</span>,
      className: "text-right",
      headerClassName: "text-right",
    },
    { key: "status", header: "Status", cell: (r) => <RefundBadge refund={r} /> },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-2">
          {r.status === "Requested" && (
            <Button size="sm" variant="primary" onClick={stop(() => setRefundStatus(r.id, "Approved"))}>
              Approve
            </Button>
          )}
          {r.status === "Approved" && (
            <Button size="sm" variant="primary" onClick={stop(() => openRefund(r.id))}>
              Process
            </Button>
          )}
          {(r.status === "Requested" || r.status === "Approved") && (
            <Button size="sm" variant="ghost" onClick={stop(() => setRefundStatus(r.id, "Declined"))}>
              Decline
            </Button>
          )}
          {(r.status === "Processed" || r.status === "Declined") && (
            <span className="text-xs text-ink-soft">
              {r.gatewayPending ? "Awaiting Razorpay" : r.status}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Refunds"
        subtitle="Review, approve and process customer refund requests, or raise one for any paid booking."
        actions={
          <Button type="button" variant="primary" onClick={() => setRaiseOpen(true)}>
            Raise Refund
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Refund} label="Open Requests" value={String(stats.open)} />
        <StatCard icon={ShieldCheck} label="Awaiting Payout" value={money(stats.pendingValue)} />
        <StatCard icon={Wallet} label="Total Refunded" value={money(stats.refunded)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by refund, booking or customer…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={result.data}
        getRowKey={(r) => r.id}
        onRowClick={(r) => openRefund(r.id)}
        minWidthClass="min-w-[900px]"
        empty={
          loadState === "loading" ? (
            <EmptyState title="Loading refunds…" message="Fetching refund requests." />
          ) : loadState === "error" ? (
            <EmptyState title="Couldn't load refunds" message="Refresh the page to try again." />
          ) : rows.length === 0 ? (
            <EmptyState title="No refund requests yet" message="Requests customers raise from My Bookings, or that you raise here, show up in this list." />
          ) : (
            <EmptyState title="No refunds found" message="Try a different search term or filters." />
          )
        }
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={result.total} onPageChange={setPage} />

      {toast && (
        <p
          role="status"
          className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink"
        >
          <span aria-hidden="true" className="text-maroon">✓</span>
          {toast}
        </p>
      )}

      <RaiseRefundModal
        open={raiseOpen}
        onClose={() => setRaiseOpen(false)}
        onCreated={(refund) => {
          setRows((prev) => [refund, ...prev.filter((r) => r.id !== refund.id)]);
          setRaiseOpen(false);
          openRefund(refund.id);
          setToast(`Refund ${refund.id} raised and approved. Click Process Refund to pay it out.`);
        }}
      />

      <Modal
        open={!!selected}
        onClose={() => openRefund(null)}
        title={selected ? `Refund ${selected.id}` : "Refund"}
        size="lg"
        footer={
          selected && (
            <>
              {selected.status === "Requested" && (
                <Button variant="primary" onClick={() => setRefundStatus(selected.id, "Approved")}>
                  Approve
                </Button>
              )}
              {selected.status === "Approved" && (
                <Button
                  variant="primary"
                  onClick={() => processRefund(selected)}
                  loading={processing}
                  disabled={processing || ((byHand || selected.method !== "Razorpay") && !utr.trim())}
                >
                  {byHand || selected.method !== "Razorpay" ? "Mark Paid" : "Process Refund"}
                </Button>
              )}
              {(selected.status === "Requested" || selected.status === "Approved") && (
                <Button variant="secondary" disabled={processing} onClick={() => setRefundStatus(selected.id, "Declined")}>
                  Decline
                </Button>
              )}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-nowrap items-center gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0 [&>*]:whitespace-nowrap">
              <RefundBadge refund={selected} />
              <span className="text-xs text-ink-soft">{selected.id}</span>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Customer"><p className="text-sm text-ink">{selected.customer}</p></Field>
              <Field label="Booking"><p className="text-sm text-ink">{selected.bookingId}</p></Field>
              <Field label="Amount"><p className="font-display text-sm font-semibold text-maroon">{money(selected.amount)}</p></Field>
              <Field label="Method"><p className="text-sm text-ink">{selected.method}</p></Field>
              <Field label="Requested"><p className="text-sm text-ink">{selected.requestedAt}</p></Field>
              {selected.processedAt && (
                <Field label="Processed"><p className="text-sm text-ink">{selected.processedAt}</p></Field>
              )}
              {selected.gatewayRefunds?.length ? (
                <Field label="Via Razorpay">
                  <ul className="space-y-0.5 text-sm text-ink">
                    {selected.gatewayRefunds.map((l) => (
                      <li key={l.id}>
                        {money(l.amount)} · {l.id} ·{" "}
                        {l.status === "processed" ? "landed" : l.status === "failed" ? "failed" : "in progress"}
                      </li>
                    ))}
                  </ul>
                </Field>
              ) : selected.gatewayRefundId ? (
                <Field label="Razorpay refund ID"><p className="text-sm text-ink">{selected.gatewayRefundId}</p></Field>
              ) : null}
              {selected.payoutRef && (
                <Field label="Paid by hand">
                  <p className="text-sm text-ink">
                    {selected.manualAmount ? `${money(selected.manualAmount)} · ` : ""}UTR {selected.payoutRef}
                  </p>
                </Field>
              )}
            </dl>

            <Field label="Reason">
              <p className="rounded-card bg-cream-2 p-3 text-sm text-ink">{selected.reason}</p>
            </Field>

            {selected.method !== "Razorpay" || selected.payoutTo ? (
              <Field label="Pay the refund to">
                <PayoutTo payout={selected.payoutTo} />
              </Field>
            ) : null}

            {selected.gatewayFailure && selected.status === "Approved" && (
              <p role="alert" className="rounded-card bg-cream-2 p-3 text-sm font-medium text-maroon">
                {selected.gatewayFailure}
              </p>
            )}

            {selected.status === "Approved" && (
              <div className="space-y-3 rounded-card border border-cream-3 p-4">
                <p className="text-sm text-ink">
                  {selected.method === "Razorpay" && !byHand
                    ? "Process Refund sends the money back through Razorpay to whatever the customer paid with (5–7 working days). If part of the booking was paid outside Razorpay, pay that part by hand and enter its UTR here first."
                    : "This refund isn't paid automatically. Send the money to the customer, then enter the UTR / transaction reference to mark it paid."}
                </p>
                {selected.method === "Razorpay" && (
                  <label className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={byHand}
                      onChange={(e) => setByHand(e.target.checked)}
                      className="accent-maroon"
                    />
                    Paid by hand — don&apos;t refund through Razorpay
                  </label>
                )}
                <Field label="UTR / transaction reference" htmlFor="refund-utr">
                  <input
                    id="refund-utr"
                    className={inputClass}
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40))}
                    placeholder="e.g. 412345678901"
                    autoComplete="off"
                  />
                </Field>
              </div>
            )}

            {actionError && (
              <p role="alert" className="rounded-card bg-cream-2 p-3 text-sm font-medium text-maroon">
                {actionError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ── Raise refund ────────────────────────────────────────────────────────── */

/**
 * Admin-initiated refund, full or partial. Posts to the same endpoint
 * customers use; the server derives the customer and caps the amount at what
 * the booking actually paid. The new refund starts Approved, so the admin's
 * next step is Process Refund — which executes the Razorpay refund for
 * gateway-paid bookings.
 */
function RaiseRefundModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (refund: AdminRefund) => void;
}) {
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setBookingId("");
    setAmount("");
    setReason("");
    setError("");
  };

  const close = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const submit = async () => {
    const id = bookingId.trim().toUpperCase();
    if (!/^BHJ-/.test(id)) {
      setError("Enter the booking ID, for example BHJ-…");
      return;
    }
    const amt = amount.trim() ? Number(amount) : undefined;
    if (amt !== undefined && (!Number.isFinite(amt) || amt <= 0)) {
      setError("Enter a refund amount above zero, or leave it blank for the full paid amount.");
      return;
    }
    if (!reason.trim()) {
      setError("Add a reason for the refund.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id, amount: amt, reason: reason.trim() }),
      });
      const data = (await res.json().catch(() => null)) as
        | { refund?: AdminRefund; error?: string }
        | null;
      if (!res.ok || !data?.refund) {
        setError(data?.error ?? "Couldn't raise the refund. Please try again.");
        return;
      }
      reset();
      onCreated(data.refund);
    } catch {
      setError("Couldn't raise the refund. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Raise Refund"
      footer={
        <>
          <Button variant="primary" onClick={submit} loading={submitting} disabled={submitting}>
            Raise Refund
          </Button>
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Booking ID" required htmlFor="raise-refund-booking">
          <input
            id="raise-refund-booking"
            className={inputClass}
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
            placeholder="BHJ-…"
            autoComplete="off"
          />
        </Field>
        <Field
          label="Amount (₹)"
          hint="Leave blank to refund the full paid amount. Anything above what was paid is capped."
          htmlFor="raise-refund-amount"
        >
          <input
            id="raise-refund-amount"
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            inputMode="numeric"
            placeholder="Full paid amount"
          />
        </Field>
        <Field label="Reason" required htmlFor="raise-refund-reason">
          <textarea
            id="raise-refund-reason"
            className={inputClass + " min-h-24"}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            placeholder="Why is this booking being refunded?"
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-medium text-maroon">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/** Status pill — a processed refund Razorpay hasn't confirmed shows as
 *  "Initiated" until the refund.processed webhook lands. */
function RefundBadge({ refund }: { refund: AdminRefund }) {
  return <StatusBadge status={refund.gatewayPending ? "Initiated" : refund.status} />;
}

/** Where a manual refund should be paid, as the customer gave it. */
function PayoutTo({ payout }: { payout?: AdminRefund["payoutTo"] }) {
  if (!payout) {
    return (
      <p className="text-sm text-ink">
        No UPI ID or bank account on file — ask the customer where to send it.
      </p>
    );
  }
  if (payout.upiId) {
    return <p className="text-sm text-ink">UPI · {payout.upiId}</p>;
  }
  return (
    <p className="text-sm text-ink">
      {payout.holderName} · A/c {payout.accountNumber} · IFSC {payout.ifsc}
    </p>
  );
}
