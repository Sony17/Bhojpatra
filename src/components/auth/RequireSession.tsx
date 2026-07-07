"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  MERGED_DASHBOARD_PATH,
  useSessionStatus,
  type AccountType,
} from "@/lib/session";

/**
 * Client-side guard for the customer/vendor/partner dashboards. Mirrors the
 * admin gate in `AdminShell`: while the session is still loading (`undefined`)
 * we render a neutral placeholder; a signed-out visitor (`null`) is bounced to
 * /login; a signed-in user who doesn't hold this account type is sent to the
 * merged dashboard. Only when the account set *includes* `role` is the
 * dashboard rendered — so one person holding customer + vendor + partner can
 * reach every one of these pages from the same login.
 *
 * The session is read from the real signed-cookie backend (via
 * `/api/auth/session`), so this reflects the authoritative server session; it's
 * still a client-side redirect for UX, paired with the middleware guard.
 */
export default function RequireSession({
  role,
  children,
}: {
  role: AccountType;
  children: ReactNode;
}) {
  const router = useRouter();
  const session = useSessionStatus();
  const allowed = session != null && session.accounts.includes(role);

  useEffect(() => {
    if (session === undefined) return; // still loading — wait
    if (session === null) {
      router.replace("/login"); // signed out
      return;
    }
    if (!session.accounts.includes(role)) {
      // Signed in but doesn't hold this account — send them to their hub.
      router.replace(MERGED_DASHBOARD_PATH);
    }
  }, [session, role, router]);

  // While loading, or redirecting the wrong/anonymous visitor, render nothing
  // to avoid flashing dashboard content they shouldn't see.
  if (!allowed) {
    return <div className="min-h-[60vh]" />;
  }

  return <>{children}</>;
}
