"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import {
  useSession,
  refreshSession,
  hasAccount,
  ACCOUNT_LABEL,
} from "@/lib/session";
import { Button, Card, Field, Input, Badge } from "@/components/ui";

/**
 * "My Profile" — edit the display name (the one place the name is editable),
 * with the login email shown read-only. Saving PATCHes `/api/auth/profile` and
 * then `refreshSession()`s so the header/menu pick up the new name immediately.
 */
export default function ProfileView() {
  const { t } = useLang();
  const session = useSession();

  const [name, setName] = useState("");
  const [initialised, setInitialised] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Seed the field once the session resolves (children mount after the guard,
  // so this is usually immediate).
  useEffect(() => {
    if (session && !initialised) {
      setName(session.name ?? "");
      setInitialised(true);
    }
  }, [session, initialised]);

  const savedName = (session?.name ?? "").trim();
  const dirty = name.trim() !== savedName;

  const displayName =
    name.trim() ||
    savedName ||
    session?.accounts
      .map((a) => t(ACCOUNT_LABEL[a].en, ACCOUNT_LABEL[a].hi))
      .join(" · ") ||
    t("Account", "अकाउंट");
  const initial = displayName.charAt(0).toUpperCase();

  async function save() {
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(d.error || t("Could not save.", "सेव नहीं हो सका।"));
      }
      await refreshSession();
      setSaved(true);
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
    <Card padding="lg" className="space-y-6">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-lg font-semibold text-cream">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink">
            {displayName}
          </p>
          <p className="truncate text-sm text-ink-soft">{session?.email}</p>
        </div>
      </div>

      <div className="grid max-w-md grid-cols-1 gap-4">
        <Field label={t("Name", "नाम")} hint={t("Shown across Bhojpatra.", "भोजपत्र पर दिखाया जाता है।")}>
          <Input
            value={name}
            maxLength={80}
            placeholder={t("Your name", "आपका नाम")}
            autoComplete="name"
            onChange={(e) => {
              setName(e.target.value);
              setSaved(false);
              setError("");
            }}
          />
        </Field>
        <Field
          label={t("Email", "ईमेल")}
          hint={t("Your login email can't be changed.", "आपका लॉगिन ईमेल बदला नहीं जा सकता।")}
        >
          <Input value={session?.email ?? ""} disabled readOnly />
        </Field>
      </div>

      <div>
        <p className="text-caption font-semibold text-ink">
          {t("Accounts you hold", "आपके अकाउंट")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {session?.accounts.map((a) => (
            <Badge key={a} tone="soft">
              {t(ACCOUNT_LABEL[a].en, ACCOUNT_LABEL[a].hi)}
            </Badge>
          ))}
          {hasAccount(session, "vendor") && (
            <Link
              href="/account/roles"
              className="text-caption font-semibold text-maroon underline-offset-2 hover:underline"
            >
              {t("Manage", "प्रबंधित करें")}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-maroon">
          {error}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button type="button" onClick={save} loading={saving} disabled={saving || !dirty}>
          {t("Save changes", "बदलाव सेव करें")}
        </Button>
        {saved && !dirty && (
          <span role="status" className="text-sm font-medium text-ink">
            <span aria-hidden className="text-maroon">✓</span>{" "}
            {t("Saved", "सेव हो गया")}
          </span>
        )}
      </div>
    </Card>
  );
}
