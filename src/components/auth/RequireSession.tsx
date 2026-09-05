"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  DASHBOARD_PATH,
  useSessionStatus,
  type AccountType,
} from "@/lib/session";

/**
 * Client-side guard for the customer/vendor/partner dashboards. Mirrors the
 * admin gate in `AdminShell`: while the session is still loading (`undefined`)
 * we render a neutral placeholder; a signed-out visitor (`null`) is bounced to
 * /login. One email holds exactly one role, so a signed-in user who isn't the
 * required `role` is sent to their own role's dashboard instead. Omit `role`
 * to allow any signed-in account (e.g. the shared /account pages).
 *
 * The session is read from the real signed-cookie backend (via
 * `/api/auth/session`), so this reflects the authoritative server session; it's
 * still a client-side redirect for UX, paired with the middleware guard.
 */
export default function RequireSession({
  role,
  children,
}: {
  role?: AccountType;
  children: ReactNode;
}) {
  const router = useRouter();
  const session = useSessionStatus();
  const allowed =
    session != null && (role === undefined || session.type === role);

  useEffect(() => {
    if (session === undefined) return; // still loading — wait
    if (session === null) {
      router.replace("/login"); // signed out
      return;
    }
    if (role !== undefined && session.type !== role) {
      // Signed in, but this page belongs to a different role — send them to
      // the one dashboard their role owns.
      router.replace(DASHBOARD_PATH[session.type]);
    }
  }, [session, role, router]);

  // While loading, or redirecting the wrong/anonymous visitor, render nothing
  // to avoid flashing dashboard content they shouldn't see.
  if (!allowed) {
    return <div className="min-h-[60vh]" />;
  }

  return <>{children}</>;
}
