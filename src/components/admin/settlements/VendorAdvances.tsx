"use client";

/**
 * Vendor Advances — money released to a caterer BEFORE the event. The admin
 * sets one rule (a % of booking value, or a flat ₹ per booking); each
 * Confirmed booking then shows the advance that rule suggests. The admin sends
 * the transfer from the Razorpay dashboard / UPI / bank and records it here
 * with its payout id or UTR. Whatever is advanced comes off that booking's
 * balance in the period settlement.
 */

import { useEffect, useMemo, useState } from "react";
import StatCard from "@/components/admin/shared/StatCard";
import SearchBar from "@/components/admin/shared/SearchBar";
import SelectFilter from "@/components/admin/shared/SelectFilter";
import DataTable, { type Column } from "@/components/admin/shared/DataTable";
import StatusBadge from "@/components/admin/shared/StatusBadge";
import Pagination from "@/components/admin/shared/Pagination";
import EmptyState from "@/components/admin/shared/EmptyState";
import { exportCsv } from "@/components/admin/shared/exportCsv";
import { money } from "@/components/admin/shared/money";
import { Banknote, Wallet, Store } from "@/components/admin/shared/icons";
import { Button, Card, Field, Input, SegmentedControl } from "@/components/ui";
import PayoutModal from "./PayoutModal";
import type { VendorAdvanceRow } from "@/lib/admin/types";
import {
  DEFAULT_VENDOR_ADVANCE_RULE,
  MAX_ADVANCE_PERCENT,
  describeVendorAdvanceRule,
  vendorAdvanceFor,
  vendorAdvanceRuleError,
  type VendorAdvanceMode,
  type VendorAdvanceRule,
} from "@/lib/vendorAdvance";

const PAGE_SIZE = 8;

const STATUS_OPTIONS = [
  { label: "All Statuses", value: "All" },
  { label: "Pending", value: "Pending" },
  { label: "Paid", value: "Paid" },
];

const MODE_OPTIONS: { value: VendorAdvanceMode; label: string }[] = [
  { value: "percent", label: "Percentage" },
  { value: "amount", label: "Fixed amount" },
];

export default function VendorAdvances() {
  const [rule, setRule] = useState<VendorAdvanceRule>(DEFAULT_VENDOR_ADVANCE_RULE);
  const [draftMode, setDraftMode] = useState<VendorAdvanceMode>("percent");
  const [draftValue, setDraftValue] = useState("0");
  const [ruleMsg, setRuleMsg] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);

  const [rows, setRows] = useState<VendorAdvanceRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<VendorAdvanceRow | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  // Bumped to refetch — e.g. after a RazorpayX send failed server-side.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/settlements/advances", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          rule?: VendorAdvanceRule;
          advances?: VendorAdvanceRow[];
          payoutsEnabled?: boolean;
        };
        if (cancelled) return;
        setPayoutsEnabled(Boolean(data.payoutsEnabled));
        if (data.rule) {
          setRule(data.rule);
          setDraftMode(data.rule.mode);
          setDraftValue(String(data.rule.value));
        }
        if (Array.isArray(data.advances)) setRows(data.advances);
      } catch {
        // Network/parse failure — show the empty state.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const saveRule = async () => {
    const draft = { mode: draftMode, value: draftValue };
    const err = vendorAdvanceRuleError(draft);
    if (err) {
      setRuleMsg(err);
      return;
    }
    setSavingRule(true);
    setRuleMsg(null);
    try {
      const res = await fetch("/api/admin/vendor-advance-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<VendorAdvanceRule> & {
        error?: string;
      };
      if (!res.ok) {
        setRuleMsg(data.error ?? "Couldn't save the rule. Please try again.");
        return;
      }
      const next: VendorAdvanceRule = { mode: data.mode ?? draftMode, value: Number(data.value) || 0 };
      setRule(next);
      setDraftValue(String(next.value));
      setRuleMsg("Saved.");
    } catch {
      setRuleMsg("Couldn't save the rule. Please try again.");
    } finally {
      setSavingRule(false);
    }
  };

  const onFilter = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  // The table previews the rule being edited, live, before it's saved.
  const draftNum = Number(draftValue);
  const previewRule: VendorAdvanceRule =
    draftValue !== "" && Number.isFinite(draftNum) && !vendorAdvanceRuleError({ mode: draftMode, value: draftNum })
      ? { mode: draftMode, value: Math.round(draftNum) }
      : rule;
  const shown = useMemo(
    () => rows.map((r) => ({ ...r, suggested: vendorAdvanceFor(previewRule, r.bookingAmount) })),
    [rows, previewRule.mode, previewRule.value], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const stats = useMemo(() => {
    const pending = shown.filter((r) => r.status === "Pending" && r.suggested > 0);
    const paid = shown.filter((r) => r.status !== "Pending");
    return {
      due: pending.reduce((s, r) => s + r.suggested, 0),
      paid: paid.reduce((s, r) => s + (r.paidAmount ?? 0), 0),
      vendors: new Set(pending.map((r) => r.vendor)).size,
    };
  }, [shown]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return shown.filter((r) => {
      const matchesQ =
        !needle ||
        r.bookingId.toLowerCase().includes(needle) ||
        r.vendor.toLowerCase().includes(needle) ||
        r.customer.toLowerCase().includes(needle);
      const matchesStatus = status === "All" || r.status === status;
      return matchesQ && matchesStatus;
    });
  }, [shown, q, status]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const recordAdvance = async (
    row: VendorAdvanceRow,
    details: { amount: number; method: string; reference: string; send?: boolean },
  ): Promise<string | null> => {
    try {
      const res = await fetch("/api/settlements/advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: row.bookingId, ...details }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        advance?: VendorAdvanceRow;
        error?: string;
      };
      if (!res.ok || !data.advance) {
        if (details.send) reload();
        return data.error ?? "Couldn't save the advance. Please try again.";
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? data.advance! : r)));
      setPaying(null);
      return null;
    } catch {
      return "Couldn't save the advance. Please try again.";
    }
  };

  const handleExport = () =>
    exportCsv(
      "bhojpatra-vendor-advances.csv",
      filtered.map((r) => ({
        Booking: r.bookingId,
        Vendor: r.vendor,
        Customer: r.customer,
        "Event Date": r.eventDate,
        "Booking Value": r.bookingAmount,
        Collected: r.collected,
        Advance: r.status === "Paid" ? (r.paidAmount ?? 0) : r.suggested,
        Status: r.status,
        Method: r.method ?? "",
        Reference: r.reference ?? "",
        "Paid On": r.paidAt ?? "",
      })),
    );

  const columns: Column<VendorAdvanceRow>[] = [
    {
      key: "vendor",
      header: "Booking",
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{r.vendor}</p>
          <p className="text-xs text-ink-soft">
            {r.bookingId} · {r.customer} · {r.eventDate}
          </p>
          {!r.payee ? (
            <p className="text-xs font-medium text-maroon">No bank / UPI on file</p>
          ) : (
            !r.payee.bankVerified &&
            !r.payee.upiVerified && <p className="text-xs font-medium text-maroon">Payout details not verified</p>
          )}
        </div>
      ),
    },
    {
      key: "value",
      header: "Booking Value",
      cell: (r) => (
        <div>
          <p className="text-ink">{money(r.bookingAmount)}</p>
          <p className="text-xs text-ink-soft">Collected {money(r.collected)}</p>
        </div>
      ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "advance",
      header: "Advance",
      cell: (r) =>
        r.status !== "Pending" ? (
          <div>
            <p className="font-display font-semibold text-ink">{money(r.paidAmount ?? 0)}</p>
            <p className="text-xs text-ink-soft">
              {r.method}
              {r.reference ? ` · ${r.reference}` : ""} · {r.paidAt}
            </p>
          </div>
        ) : (
          <span className="font-display font-semibold text-ink">{money(r.suggested)}</span>
        ),
      className: "text-right",
      headerClassName: "text-right",
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <div className="space-y-1">
          <StatusBadge status={r.status} />
          {r.lastFailure && r.status === "Pending" && (
            <p className="max-w-[14rem] text-xs font-medium text-maroon">Razorpay failed: {r.lastFailure}</p>
          )}
          {r.status !== "Pending" && r.bookingStatus === "Cancelled" && (
            <p className="text-xs font-medium text-maroon">Booking cancelled · recover</p>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      cell: (r) =>
        r.status === "Pending" ? (
          <Button
            size="sm"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              setPaying(r);
            }}
          >
            {r.lastFailure ? "Retry Advance" : "Pay Advance"}
          </Button>
        ) : (
          <span className="text-xs text-ink-soft">{r.status === "Processing" ? "Sending…" : "Advanced"}</span>
        ),
    },
  ];

  const dirty = draftMode !== rule.mode || String(rule.value) !== draftValue;

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="font-display text-xl text-ink">Advance rule</h2>
            <p className="text-sm text-ink-soft">
              How much of a caterer&apos;s payout to release before the event. Currently:{" "}
              <span className="font-semibold text-ink">{describeVendorAdvanceRule(rule)}</span>
              {(previewRule.mode !== rule.mode || previewRule.value !== rule.value) && (
                <span className="block text-maroon">
                  Previewing {describeVendorAdvanceRule(previewRule)} below — click Save rule to apply.
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <SegmentedControl
              ariaLabel="Advance type"
              className="shrink-0 self-start whitespace-nowrap sm:self-auto"
              options={MODE_OPTIONS}
              value={draftMode}
              onChange={(m) => {
                setDraftMode(m);
                // A % isn't a ₹ amount — start the other type from its saved
                // value (or blank), never carry "30" across.
                setDraftValue(m === rule.mode ? String(rule.value) : "");
                setRuleMsg(null);
              }}
            />
            <div className="sm:w-44">
              <Field label={draftMode === "percent" ? "Percent of booking" : "Amount per booking (₹)"}>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={draftMode === "percent" ? MAX_ADVANCE_PERCENT : undefined}
                  value={draftValue}
                  placeholder={draftMode === "percent" ? "e.g. 30" : "e.g. 5000"}
                  onChange={(e) => {
                    setDraftValue(e.target.value);
                    setRuleMsg(null);
                  }}
                />
              </Field>
            </div>
            <Button type="button" variant="primary" size="sm" onClick={saveRule} disabled={savingRule || !dirty}>
              {savingRule ? "Saving…" : "Save rule"}
            </Button>
          </div>
        </div>
        {ruleMsg && (
          <p role="status" className="mt-3 text-sm font-medium text-maroon">
            {ruleMsg}
          </p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard icon={Banknote} label="Advances Due" value={money(stats.due)} />
        <StatCard icon={Wallet} label="Advanced" value={money(stats.paid)} />
        <StatCard icon={Store} label="Vendors Awaiting" value={String(stats.vendors)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={q}
          onChange={onFilter(setQ)}
          placeholder="Search by vendor, customer or booking…"
          className="lg:max-w-sm lg:flex-1"
        />
        <div className="flex flex-nowrap gap-2.5 overflow-x-auto no-scrollbar [&>*]:shrink-0">
          <SelectFilter label="Status" value={status} options={STATUS_OPTIONS} onChange={onFilter(setStatus)} />
          <Button type="button" variant="secondary" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(r) => r.id}
        empty={
          <EmptyState
            title={loaded ? "No advances to show" : "Loading…"}
            message={loaded ? "Confirmed bookings with a vendor appear here." : ""}
          />
        }
      />

      <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />

      {paying && (
        <PayoutModal
          key={paying.id}
          open
          title="Pay vendor advance"
          subtitle={
            `${paying.vendor} · ${paying.bookingId} · event ${paying.eventDate}. Send the transfer first, then record it here.`
          }
          payee={paying.payee}
          payoutsEnabled={payoutsEnabled}
          lastFailure={paying.lastFailure}
          amount={paying.suggested || paying.collected}
          amountEditable
          maxAmount={paying.bookingAmount}
          amountHint={(a) =>
            a > paying.collected
              ? `More than the ${money(paying.collected)} collected from the customer so far.`
              : undefined
          }
          submitLabel="Record advance"
          onClose={() => setPaying(null)}
          onSubmit={(d) => recordAdvance(paying, d)}
        />
      )}
    </div>
  );
}
