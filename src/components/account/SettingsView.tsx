"use client";

import { useLang, type Lang } from "@/lib/i18n";
import { useSession, ACCOUNT_LABEL } from "@/lib/session";
import { Button, Card, SegmentedControl, Badge } from "@/components/ui";

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
];

/**
 * Account "Settings" — the language preference (persisted per-user via
 * `useLang().setLang` → `/api/auth/preferences`) plus read-only account info and
 * quick links into the other sections. Security actions (password) and account
 * types (roles) live on their own pages, linked from here.
 */
export default function SettingsView() {
  const { t, lang, setLang } = useLang();
  const session = useSession();

  return (
    <div className="space-y-5">
      <Card padding="lg" className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {t("Language", "भाषा")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              "Choose the language for Bhojpatra. It follows you across devices.",
              "भोजपत्र के लिए भाषा चुनें। यह हर डिवाइस पर आपके साथ रहती है।",
            )}
          </p>
        </div>
        <SegmentedControl<Lang>
          options={LANG_OPTIONS}
          value={lang}
          onChange={setLang}
          ariaLabel={t("Language", "भाषा")}
        />
      </Card>

      <Card padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            {t("Account", "अकाउंट")}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{session?.email}</p>
        </div>
        <div>
          <p className="text-caption font-semibold text-ink">
            {t("Account type", "अकाउंट प्रकार")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {session?.accounts.map((a) => (
              <Badge key={a} tone="soft">
                {t(ACCOUNT_LABEL[a].en, ACCOUNT_LABEL[a].hi)}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button href="/account/password" variant="secondary" size="sm">
            {t("Change Password", "पासवर्ड बदलें")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
