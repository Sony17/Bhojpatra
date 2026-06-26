"use client";

import { useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import { Field, inputClass, Toggle } from "@/components/admin/shared/FormControls";
import { adminProfile, businessDetails, adminRoles } from "@/lib/admin/mockData";
import type { BusinessDetails } from "@/lib/admin/types";

const TABS: TabItem[] = [
  { id: "profile", label: "Admin Profile" },
  { id: "business", label: "Business" },
  { id: "notifications", label: "Notifications" },
  { id: "roles", label: "Roles" },
];

export default function SettingsView() {
  const [tab, setTab] = useState("profile");
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin Panel" title="Settings" subtitle="Platform configuration and admin profile." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "profile" && <ProfileTab />}
      {tab === "business" && <BusinessTab />}
      {tab === "notifications" && <NotificationsTab />}
      {tab === "roles" && <RolesTab />}
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

function NotificationsTab() {
  const [prefs, setPrefs] = useState([
    { id: "vendor", label: "New vendor applications", on: true },
    { id: "booking", label: "New bookings", on: true },
    { id: "payment", label: "Payments received", on: true },
    { id: "refund", label: "Refund requests", on: false },
    { id: "settlement", label: "Vendor settlement reminders", on: false },
  ]);
  const toggle = (id: string) => setPrefs((p) => p.map((x) => (x.id === id ? { ...x, on: !x.on } : x)));

  return (
    <WidgetCard title="Notification Settings">
      <ul className="divide-y divide-cream-3">
        {prefs.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-3.5">
            <span className="text-sm text-ink">{p.label}</span>
            <Toggle checked={p.on} onChange={() => toggle(p.id)} label={p.label} />
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

function RolesTab() {
  return (
    <WidgetCard title="Roles & Permissions">
      <p className="mb-4 text-sm text-ink-soft">
        Role-based access control is read-only in this prototype. Editable permissions arrive with authentication.
      </p>
      <ul className="space-y-3">
        {adminRoles.map((r) => (
          <li key={r.name} className="flex items-center justify-between rounded-xl border border-cream-3 p-4">
            <div>
              <p className="font-medium text-ink">{r.name}</p>
              <p className="text-sm text-ink-soft">{r.description}</p>
            </div>
            <span className="shrink-0 rounded-full bg-cream-2 px-3 py-1 text-xs font-semibold text-ink">{r.members} members</span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
