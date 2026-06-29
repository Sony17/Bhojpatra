"use client";

import { Suspense, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminSession } from "@/lib/adminAuth";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

/**
 * Admin application shell. Owns the mobile sidebar open-state and composes the
 * fixed sidebar + sticky topbar around the routed page content.
 *
 * On lg+ the sidebar is permanently visible and the content is offset by its
 * width (`lg:pl-64`). On smaller screens the sidebar slides in as an overlay
 * drawer with a dimmed backdrop.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const admin = useAdminSession();
  const isLoginRoute = pathname === "/admin/login";

  // Gate every admin route except the login page. `undefined` means the
  // session is still loading (server + first client render) — wait. `null`
  // means signed out — bounce to the login page.
  useEffect(() => {
    if (!isLoginRoute && admin === null) {
      router.replace("/admin/login");
    }
  }, [isLoginRoute, admin, router]);

  // The login page renders full-screen, without the sidebar/topbar chrome.
  if (isLoginRoute) {
    return <>{children}</>;
  }

  // While loading, or redirecting an unauthenticated visitor, render nothing
  // to avoid flashing the admin chrome.
  if (admin === undefined || admin === null) {
    return <div className="min-h-screen bg-surface-beige" />;
  }

  return (
    <div className="min-h-screen bg-surface-beige text-ink">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />

      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      <div className="lg:pl-64">
        {/* Topbar reads the URL query (useSearchParams) — needs a Suspense
            boundary so the admin pages can be statically prerendered. */}
        <Suspense fallback={<div className="h-16 border-b border-cream-3 bg-white" />}>
          <AdminTopbar onMenu={() => setOpen(true)} />
        </Suspense>
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
