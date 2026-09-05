"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DASHBOARD_PATH, useSessionStatus } from "@/lib/session";

/**
 * The /dashboard router body. Every login holds exactly one role, so there is
 * no merged multi-account hub any more — this just forwards the visitor to the
 * one dashboard their role owns, or to /login when signed out. Rendered as a
 * client component (not a server `redirect()`) because the decision needs the
 * session, and the old links/buttons all over the app still point here.
 */
export default function DashboardRouter() {
  const router = useRouter();
  const session = useSessionStatus();

  useEffect(() => {
    if (session === undefined) return; // still loading — wait
    if (session === null) {
      router.replace("/login");
      return;
    }
    router.replace(DASHBOARD_PATH[session.type]);
  }, [session, router]);

  // Neutral placeholder while the session resolves / the redirect lands.
  return <div className="min-h-[60vh]" />;
}
