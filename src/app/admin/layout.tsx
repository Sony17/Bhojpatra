import type { Metadata } from "next";
import AdminShell from "@/components/admin/layout/AdminShell";

/**
 * Admin route-segment layout. Wraps every `/admin/*` page in the persistent
 * shell (fixed sidebar + sticky topbar). The root layout still provides
 * <html>/<body> + fonts, so this only arranges the admin surface — exactly the
 * pattern used by `(auth)/layout.tsx`. Public pages are unaffected.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin — Bhojpatra",
    template: "%s — Bhojpatra Admin",
  },
  description: "Bhojpatra platform control panel.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
