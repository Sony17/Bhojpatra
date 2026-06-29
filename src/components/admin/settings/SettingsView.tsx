"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import { adminProfile, businessDetails } from "@/lib/admin/mockData";
import type { BusinessDetails } from "@/lib/admin/types";
import { DEFAULT_MERCHANT, isValidVpa } from "@/lib/upi";

const TABS: TabItem[] = [
  { id: "profile", label: "Admin Profile" },
  { id: "business", label: "Business" },
  { id: "payments", label: "Payments (UPI)" },
];

export default function SettingsView() {
  const [tab, setTab] = useState("profile");
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin Panel" title="Settings" subtitle="Platform configuration and admin profile." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "profile" && <ProfileTab />}
      {tab === "business" && <BusinessTab />}
      {tab === "payments" && <PaymentsTab />}
    </div>
  );
}

function SavedChip({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-cream-2 px-3.5 py-1.5 text-sm font-medium text-ink">
      <span aria-hidden="true" className="text-maroon">✓</span> Saved
    </span>
  );
}

function ProfileTab() {
  const [name, setName] = useState(adminProfile.name);
  const [email, setEmail] = useState("admin@bhojpatra.co.in");
  const [saved, setSaved] = useState(false);

  return (
    <WidgetCard title="Admin Profile">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name"><input className={inputClass} value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} /></Field>
        <Field label="Email"><input type="email" className={inputClass} value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} /></Field>
        <Field label="Role"><input className={inputClass} value={adminProfile.role} disabled /></Field>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={() => setSaved(true)} className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark">Save changes</button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}

function BusinessTab() {
  const [biz, setBiz] = useState<BusinessDetails>(businessDetails);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof BusinessDetails, v: string) => { setBiz({ ...biz, [k]: v }); setSaved(false); };

  return (
    <WidgetCard title="Business Details">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business Name"><input className={inputClass} value={biz.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Tagline"><input className={inputClass} value={biz.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
        <Field label="Phone / WhatsApp"><input className={inputClass} value={biz.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><input className={inputClass} value={biz.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Hours"><input className={inputClass} value={biz.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
        <Field label="Instagram"><input className={inputClass} value={biz.instagram} onChange={(e) => set("instagram", e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Field label="Address"><input className={inputClass} value={biz.address} onChange={(e) => set("address", e.target.value)} /></Field>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={() => setSaved(true)} className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark">Save changes</button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}

function PaymentsTab() {
  const [vpa, setVpa] = useState(DEFAULT_MERCHANT.vpa);
  const [payeeName, setPayeeName] = useState(DEFAULT_MERCHANT.payeeName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load the persisted merchant identity used by customer checkout.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { vpa?: string; payeeName?: string } | null) => {
        if (active && d?.vpa) {
          setVpa(d.vpa);
          setPayeeName(d.payeeName ?? DEFAULT_MERCHANT.payeeName);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setError("");
    if (!isValidVpa(vpa)) {
      setError("Enter a valid UPI ID (e.g. name@bank).");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpa, payeeName }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error || "Could not save settings.");
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WidgetCard title="UPI Collection">
      <p className="mb-4 text-sm text-ink-soft">
        This UPI ID receives customer advance payments. It powers the live
        deep-link and QR code shown at checkout.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Merchant UPI ID">
          <input
            className={inputClass}
            value={vpa}
            placeholder="bhojpatra@hdfcbank"
            onChange={(e) => {
              setVpa(e.target.value);
              setSaved(false);
              setError("");
            }}
          />
        </Field>
        <Field label="Payee Name">
          <input
            className={inputClass}
            value={payeeName}
            onChange={(e) => {
              setPayeeName(e.target.value);
              setSaved(false);
            }}
          />
        </Field>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-maroon">{error}</p>}
      <div className="mt-5 flex items-center gap-4">
        <button type="button" disabled={saving} onClick={save} className="rounded-full bg-maroon px-5 py-2.5 text-sm font-semibold text-cream shadow-sm transition-colors hover:bg-maroon-dark disabled:opacity-60">
          {saving ? "Saving…" : "Save changes"}
        </button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}
