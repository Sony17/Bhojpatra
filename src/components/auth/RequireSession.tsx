"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_PATH, useSessionStatus, type AccountType } from "@/lib/session";

/**
 * Client-side guard for the customer/vendor dashboards. Mirrors the admin gate
 * in `AdminShell`: while the session is still loading (`undefined`) we render a
 * neutral placeholder; a signed-out visitor (`null`) is bounced to /login; a
 * signed-in user on the wrong dashboard is sent to their own. Only when the
 * stored account type matches `role` is the dashboard rendered.
 *
 * This is a demo-grade gate (the session lives in localStorage). It stops the
 * dashboards from showing to the wrong/anonymous visitor, but is not a
 * substitute for server-side auth — see the note in `session.ts`.
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
  const allowed = session != null && session.type === role;

  useEffect(() => {
    if (session === undefined) return; // still loading — wait
    if (session === null) {
      router.replace("/login"); // signed out
      return;
    }
    if (session.type !== role) {
      router.replace(DASHBOARD_PATH[session.type]); // wrong dashboard for this account
    }
  }, [session, role, router]);

  // While loading, or redirecting the wrong/anonymous visitor, render nothing
  // to avoid flashing dashboard content they shouldn't see.
  if (!allowed) {
    return <div className="min-h-[60vh]" />;
  }

  return <>{children}</>;
}
