"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { useSession, hasAccount } from "@/lib/session";
import { cn } from "@/components/ui";

/** The account sub-sections, in the order the profile menu lists them.
 *  `vendorOnly` (Roles) shows only for accounts that hold the vendor type. */
const NAV: { href: string; en: string; hi: string; vendorOnly?: boolean }[] = [
  { href: "/account/profile", en: "My Profile", hi: "मेरी प्रोफ़ाइल" },
  { href: "/account/settings", en: "Settings", hi: "सेटिंग्स" },
  { href: "/account/password", en: "Change Password", hi: "पासवर्ड बदलें" },
  { href: "/account/roles", en: "Roles", hi: "भूमिकाएँ", vendorOnly: true },
];

/**
 * Shared frame for every `/account/*` page: the "My Account" heading and the
 * section nav. The nav is a single horizontal scroll row on mobile (matching the
 * app-wide pattern) and wraps on desktop. Each page renders only its own body.
 */
export default function AccountShell({ children }: { children: ReactNode }) {
  const { t } = useLang();
  const pathname = usePathname();
  const session = useSession();
  const items = NAV.filter(
    (item) => !item.vendorOnly || hasAccount(session, "vendor"),
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-2xl leading-tight text-ink sm:text-3xl">
        {t("My Account", "मेरा अकाउंट")}
      </h1>

      <nav
        aria-label={t("Account sections", "अकाउंट सेक्शन")}
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-maroon text-cream"
                  : "border border-maroon/30 text-ink hover:bg-maroon/5",
              )}
            >
              {t(item.en, item.hi)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">{children}</div>
    </div>
  );
}
