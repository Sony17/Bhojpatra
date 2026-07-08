"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/admin/shared/PageHeader";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import Tabs, { type TabItem } from "@/components/admin/shared/Tabs";
import { Field, inputClass } from "@/components/admin/shared/FormControls";
import { Button } from "@/components/ui";
import { adminProfile, businessDetails } from "@/lib/admin/mockData";
import type { BusinessDetails } from "@/lib/admin/types";
import { DEFAULT_MERCHANT, isValidVpa } from "@/lib/upi";

/** Cap the uploaded QR file so its base64 form stays within the settings row's
 *  budget (data URLs are ~1.37× the binary size; see MAX_QR_IMAGE_CHARS). */
const MAX_QR_FILE_BYTES = 400 * 1024;

const TABS: TabItem[] = [
  { id: "profile", label: "Admin Profile" },
  { id: "password", label: "Change Password" },
  { id: "business", label: "Business" },
  { id: "occasions", label: "Occasions" },
  { id: "locations", label: "Locations" },
  { id: "payments", label: "Payments (UPI)" },
];

export default function SettingsView() {
  const [tab, setTab] = useState("profile");
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin Panel" title="Settings" subtitle="Platform configuration and admin profile." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === "profile" && <ProfileTab />}
      {tab === "password" && <ChangePasswordTab />}
      {tab === "business" && <BusinessTab />}
      {tab === "occasions" && (
        <NameListTab
          dataKey="occasions"
          title="Occasions"
          description="Occasions offered in the homepage booking bar and the booking wizard. Customers can enter their own via the “Other” option. Hindi is optional — it defaults to the English name. Lead (days) is the minimum advance notice to book that occasion (weddings need more than a birthday); it’s combined with the package’s own lead — leave blank to use the default (7 days)."
          endpoint="/api/admin/occasions"
          addLabel="+ Add occasion"
          namePlaceholder="e.g. Anniversary"
          nameHiPlaceholder="e.g. सालगिरह"
          emptyError="Add at least one occasion."
          withLead
          leadPlaceholder="e.g. 30"
        />
      )}
      {tab === "locations" && (
        <NameListTab
          dataKey="locations"
          title="Serviceable Locations"
          description="Cities / states offered in the homepage booking bar and the booking wizard. Customers outside this list can still enter their own via the “Other” option. Hindi is optional — it defaults to the English name."
          endpoint="/api/admin/locations"
          addLabel="+ Add location"
          namePlaceholder="e.g. Nagpur"
          nameHiPlaceholder="e.g. नागपुर"
          emptyError="Add at least one location."
        />
      )}
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
        <Button type="button" onClick={() => setSaved(true)}>Save changes</Button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}

function ChangePasswordTab() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const edit = (set: (v: string) => void) => (value: string) => {
    set(value);
    setSaved(false);
    setError("");
  };

  const save = async () => {
    setError("");
    if (!current || !next) {
      setError("Enter your current and new password.");
      return;
    }
    if (next.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New password and confirmation don’t match.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error || "Could not change password.");
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <WidgetCard title="Change Password">
      <p className="mb-4 text-sm text-ink-soft">
        Update the password you use to sign in to the admin console. You’ll need
        your current password to confirm.
      </p>
      <div className="grid max-w-md grid-cols-1 gap-4">
        <Field label="Current password">
          <input
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={current}
            onChange={(e) => edit(setCurrent)(e.target.value)}
          />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={next}
            onChange={(e) => edit(setNext)(e.target.value)}
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={confirm}
            onChange={(e) => edit(setConfirm)(e.target.value)}
          />
        </Field>
      </div>
      {error && <p role="alert" className="mt-3 text-sm font-medium text-maroon">{error}</p>}
      <div className="mt-5 flex items-center gap-4">
        <Button
          type="button"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Updating…" : "Update password"}
        </Button>
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
        <Button type="button" onClick={() => setSaved(true)}>Save changes</Button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}

type NameRow = { id: string; name: string; nameHi: string; leadDays?: number };

/**
 * Reusable editor for a simple admin-managed name list (Occasions, Locations).
 * Loads from `endpoint` (GET returns `{ [dataKey]: NameRow[] }`), lets the admin
 * add / edit / remove rows, and POSTs the cleaned list back under the same key.
 * When `withLead` is set (Occasions), each row also carries an optional numeric
 * "Lead (days)" — the minimum advance notice to book that occasion.
 */
function NameListTab({
  dataKey,
  title,
  description,
  endpoint,
  addLabel,
  namePlaceholder,
  nameHiPlaceholder,
  emptyError,
  withLead = false,
  leadPlaceholder = "e.g. 7",
}: {
  dataKey: "occasions" | "locations";
  title: string;
  description: string;
  endpoint: string;
  addLabel: string;
  namePlaceholder: string;
  nameHiPlaceholder: string;
  emptyError: string;
  withLead?: boolean;
  leadPlaceholder?: string;
}) {
  const [rows, setRows] = useState<NameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Load the admin-curated list (the API falls back to the seed list).
  useEffect(() => {
    let active = true;
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, NameRow[]> | null) => {
        const list = d?.[dataKey];
        if (active && Array.isArray(list)) setRows(list);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint, dataKey]);

  const update = (i: number, key: "name" | "nameHi", value: string) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
    setSaved(false);
    setError("");
  };
  // Lead is optional and numeric — a blank field clears it so the booking flow
  // falls back to the default notice.
  const updateLead = (i: number, value: string) => {
    const n =
      value.trim() === "" ? undefined : Math.max(0, Math.round(Number(value)));
    const leadDays = n !== undefined && Number.isFinite(n) ? n : undefined;
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, leadDays } : r)));
    setSaved(false);
    setError("");
  };
  const addRow = () => {
    setRows((rs) => [...rs, { id: "", name: "", nameHi: "" }]);
    setSaved(false);
  };
  const removeRow = (i: number) => {
    setRows((rs) => rs.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const save = async () => {
    setError("");
    const cleaned = rows.filter((r) => r.name.trim());
    if (!cleaned.length) {
      setError(emptyError);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [dataKey]: cleaned }),
      });
      const d = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error((d.error as string) || "Could not save changes.");
      const next = d[dataKey];
      if (Array.isArray(next)) setRows(next as NameRow[]);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // Occasions carry an extra numeric lead column; locations keep two columns.
  const gridCols = withLead
    ? "sm:grid-cols-[1fr_1fr_7rem_auto]"
    : "sm:grid-cols-[1fr_1fr_auto]";

  return (
    <WidgetCard title={title}>
      <p className="mb-4 text-sm text-ink-soft">{description}</p>
      {loading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="space-y-3">
          <div className={"hidden gap-3 px-1 sm:grid " + gridCols}>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Name (English)</span>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Name (Hindi)</span>
            {withLead && (
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Lead (days)</span>
            )}
            <span className="sr-only">Actions</span>
          </div>
          {rows.map((row, i) => (
            <div key={i} className={"grid grid-cols-1 gap-3 sm:items-center " + gridCols}>
              <input
                className={inputClass}
                value={row.name}
                placeholder={namePlaceholder}
                aria-label="Name (English)"
                onChange={(e) => update(i, "name", e.target.value)}
              />
              <input
                className={inputClass}
                value={row.nameHi}
                placeholder={nameHiPlaceholder}
                aria-label="Name (Hindi)"
                onChange={(e) => update(i, "nameHi", e.target.value)}
              />
              {withLead && (
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className={inputClass}
                  value={row.leadDays ?? ""}
                  placeholder={leadPlaceholder}
                  aria-label={`Lead time in days for ${row.name || "occasion"}`}
                  onChange={(e) => updateLead(i, e.target.value)}
                />
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeRow(i)}
                aria-label={`Remove ${row.name || "row"}`}
              >
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
          >
            {addLabel}
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-maroon">{error}</p>}
      <div className="mt-5 flex items-center gap-4">
        <Button
          type="button"
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}

function PaymentsTab() {
  const [vpa, setVpa] = useState(DEFAULT_MERCHANT.vpa);
  const [payeeName, setPayeeName] = useState(DEFAULT_MERCHANT.payeeName);
  // Optional custom QR image (base64 data URL). Empty = use the generated QR.
  const [qrImage, setQrImage] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Load the persisted merchant identity used by customer checkout.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { vpa?: string; payeeName?: string; qrImage?: string } | null) => {
          if (active && d?.vpa) {
            setVpa(d.vpa);
            setPayeeName(d.payeeName ?? DEFAULT_MERCHANT.payeeName);
            setQrImage(d.qrImage ?? "");
          }
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Read a chosen QR image file into a data URL we can persist and preview.
  const onPickQr = (file: File | undefined) => {
    setSaved(false);
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (PNG, JPEG or WebP).");
      return;
    }
    if (file.size > MAX_QR_FILE_BYTES) {
      setError("That image is too large — please use one under 400 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setQrImage(reader.result);
    };
    reader.onerror = () => setError("Couldn't read that image. Try another.");
    reader.readAsDataURL(file);
  };

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
        body: JSON.stringify({ vpa, payeeName, qrImage }),
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

      <div className="mt-6 border-t border-cream-3 pt-5">
        <p className="text-sm font-semibold text-ink">Custom QR image</p>
        <p className="mt-1 text-sm text-ink-soft">
          Upload your own bank / GPay / PhonePe QR to show customers at checkout.
          When set, it replaces the QR we generate from the UPI ID above. Leave
          empty to use the generated one.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          {qrImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrImage}
              alt="Uploaded payment QR"
              className="h-40 w-40 shrink-0 rounded-card border border-cream-3 bg-white p-2 object-contain"
            />
          ) : (
            <div className="flex h-40 w-40 shrink-0 items-center justify-center rounded-card border border-dashed border-cream-3 bg-cream-2/40 px-3 text-center text-xs text-ink-soft">
              No custom QR — the generated QR is shown to customers.
            </div>
          )}
          <div className="flex flex-col gap-3">
            <label className="inline-flex w-fit cursor-pointer items-center rounded-full border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition-colors hover:bg-maroon/5">
              {qrImage ? "Replace image" : "Upload QR image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  onPickQr(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {qrImage && (
              <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={() => {
                  setQrImage("");
                  setSaved(false);
                  setError("");
                }}
              >
                Remove
              </Button>
            )}
            <p className="max-w-xs text-xs text-ink-soft">
              PNG, JPEG or WebP up to 400 KB. This is a mock — payments aren’t
              verified automatically; customers tap “I’ve paid” after scanning.
            </p>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm font-medium text-maroon">{error}</p>}
      <div className="mt-5 flex items-center gap-4">
        <Button type="button" disabled={saving} onClick={save}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <SavedChip show={saved} />
      </div>
    </WidgetCard>
  );
}
