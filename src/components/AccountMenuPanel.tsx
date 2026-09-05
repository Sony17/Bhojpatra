"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang, type Lang } from "@/lib/i18n";
import {
  logout,
  DASHBOARD_HOME_PATH,
  ACCOUNT_LABEL,
  useSession,
  hasAccount,
} from "@/lib/session";

/** Language choices surfaced inside the account menu. */
const LANG_OPTIONS: { id: Lang; full: string }[] = [
  { id: "en", full: "English" },
  { id: "hi", full: "हिंदी" },
];

/** Signed-in account actions, in the order the profile menu lists them.
 *  `customerOnly` items (My Bookings) show only for customer accounts — one
 *  email holds one role, and the bookings dashboard belongs to customers. */
const ACCOUNT_LINKS: {
  href: string;
  en: string;
  hi: string;
  customerOnly?: boolean;
}[] = [
  { href: "/bookings", en: "My Bookings", hi: "मेरी बुकिंग", customerOnly: true },
  { href: "/account/profile", en: "My Profile", hi: "मेरी प्रोफ़ाइल" },
  { href: "/account/settings", en: "Settings", hi: "सेटिंग्स" },
  { href: "/account/password", en: "Change Password", hi: "पासवर्ड बदलें" },
];

/**
 * The dropdown body shared by the desktop header profile menu and the mobile
 * bottom-bar account tab. Renders the account actions (My Dashboard / Log Out
 * when signed in; Log In / Sign Up when signed out) plus the English/Hindi
 * language switch. The trigger + positioning live in each caller; this is just
 * the panel so both entry points stay in visual sync.
 *
 * `onClose` is invoked whenever an item is chosen so the caller can dismiss the
 * popup (language changes deliberately keep it open).
 */
export default function AccountMenuPanel({ onClose }: { onClose: () => void }) {
  const { t, lang, setLang } = useLang();
  const router = useRouter();
  const session = useSession();

  const name = session?.name?.trim();
  // One email ↔ one role — show the single account type.
  const typeLabel = session
    ? t(ACCOUNT_LABEL[session.type].en, ACCOUNT_LABEL[session.type].hi)
    : "";
  const displayName = name || typeLabel || t("Account", "अकाउंट");
  const initial = displayName.charAt(0).toUpperCase();

  async function handleLogout() {
    onClose();
    await logout();
    router.push("/");
  }

  return (
    <ul className="overflow-hidden rounded-card border border-maroon/15 bg-white shadow-pop">
      {session ? (
        <li className="border-b border-maroon/10">
          <Link
            href={DASHBOARD_HOME_PATH}
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-maroon/5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-sm font-semibold text-cream">
              {initial}
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-ink">
                {displayName}
              </span>
              <span className="text-xs text-ink/70">{typeLabel}</span>
            </span>
          </Link>
        </li>
      ) : (
        <li className="border-b border-maroon/10 px-4 py-3">
          <p className="text-sm font-semibold text-ink">
            {t("Welcome to Bhojpatra", "भोजपत्र में आपका स्वागत है")}
          </p>
          <p className="text-xs text-ink/70">
            {t("Log in or create an account", "लॉग इन करें या अकाउंट बनाएँ")}
          </p>
        </li>
      )}

      {session ? (
        <>
          {ACCOUNT_LINKS.filter(
            (item) => !item.customerOnly || hasAccount(session, "customer"),
          ).map((item) => (
            <li key={item.href} className="border-b border-maroon/10">
              <Link
                href={item.href}
                onClick={onClose}
                className="block px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-maroon/5"
              >
                {t(item.en, item.hi)}
              </Link>
            </li>
          ))}
          <li className="border-b border-maroon/10">
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-maroon/5"
            >
              {t("Log Out", "लॉग आउट")}
            </button>
          </li>
        </>
      ) : (
        <>
          <li className="border-b border-maroon/10">
            <Link
              href="/login"
              onClick={onClose}
              className="block px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-maroon/5"
            >
              {t("Log In", "लॉग इन")}
            </Link>
          </li>
          <li className="border-b border-maroon/10">
            <Link
              href="/signup"
              onClick={onClose}
              className="block px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-maroon/5"
            >
              {t("Sign Up", "साइन अप")}
            </Link>
          </li>
        </>
      )}

      <li className="px-3 py-3">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink/60">
          {t("Language", "भाषा")}
        </p>
        <div className="flex gap-1.5">
          {LANG_OPTIONS.map((o) => {
            const active = lang === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setLang(o.id)}
                aria-pressed={active}
                className={
                  "focus-ring flex-1 rounded-control px-3 py-2 text-sm font-semibold transition-colors " +
                  (active
                    ? "bg-maroon text-cream"
                    : "border border-maroon/30 text-ink hover:bg-maroon/5")
                }
              >
                {o.full}
              </button>
            );
          })}
        </div>
      </li>
    </ul>
  );
}
