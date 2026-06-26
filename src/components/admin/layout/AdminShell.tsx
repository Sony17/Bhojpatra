"use client";

import { useState } from "react";
import type { ReactNode } from "react";
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
        <AdminTopbar onMenu={() => setOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
