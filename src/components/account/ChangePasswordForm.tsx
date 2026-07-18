"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { Button, Card, Field, Input } from "@/components/ui";

/**
 * "Change Password" for the signed-in booking account. Same contract as the
 * admin console's tab — `POST /api/auth/change-password` with the current + new
 * password — but on the public account chrome and bilingual. The API is the
 * source of truth for validation; its error messages are surfaced verbatim.
 */
export default function ChangePasswordForm() {
  const { t } = useLang();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const edit = (set: (v: string) => void) => (value: string) => {
    set(value);
    setSaved(false);
    setError("");
  };

  async function save() {
    setError("");
    if (!current || !next) {
      setError(t("Enter your current and new password.", "अपना मौजूदा और नया पासवर्ड दर्ज करें।"));
      return;
    }
    if (next.length < 8) {
      setError(t("New password must be at least 8 characters.", "नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।"));
      return;
    }
    if (next !== confirm) {
      setError(t("New password and confirmation don’t match.", "नया पासवर्ड और पुष्टि मेल नहीं खाते।"));
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
      if (!res.ok) {
        throw new Error(d.error || t("Could not change password.", "पासवर्ड नहीं बदला जा सका।"));
      }
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("Something went wrong.", "कुछ गड़बड़ हो गई।"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card padding="lg">
      <h2 className="text-base font-semibold text-ink">
        {t("Change Password", "पासवर्ड बदलें")}
      </h2>
      <p className="mb-4 mt-1 text-sm text-ink-soft">
        {t(
          "You’ll need your current password to confirm the change.",
          "बदलाव की पुष्टि के लिए आपको अपना मौजूदा पासवर्ड चाहिए होगा।",
        )}
      </p>

      <div className="grid max-w-md grid-cols-1 gap-4">
        <Field label={t("Current password", "मौजूदा पासवर्ड")}>
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => edit(setCurrent)(e.target.value)}
          />
        </Field>
        <Field
          label={t("New password", "नया पासवर्ड")}
          hint={t("At least 8 characters.", "कम से कम 8 अक्षर।")}
        >
          <Input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => edit(setNext)(e.target.value)}
          />
        </Field>
        <Field label={t("Confirm new password", "नए पासवर्ड की पुष्टि करें")}>
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => edit(setConfirm)(e.target.value)}
          />
        </Field>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-maroon">
          {error}
        </p>
      )}

      <div className="mt-5 flex items-center gap-4">
        <Button type="button" onClick={save} loading={saving} disabled={saving}>
          {t("Update password", "पासवर्ड अपडेट करें")}
        </Button>
        {saved && (
          <span role="status" className="text-sm font-medium text-ink">
            <span aria-hidden className="text-maroon">✓</span>{" "}
            {t("Password updated", "पासवर्ड अपडेट हुआ")}
          </span>
        )}
      </div>
    </Card>
  );
}
