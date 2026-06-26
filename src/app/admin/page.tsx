import type { Metadata } from "next";
import PageHeader from "@/components/admin/shared/PageHeader";

export const metadata: Metadata = { title: "Admin" };

/**
 * `/admin` landing for Phase 1A. Renders inside the admin shell so the
 * foundation (sidebar + topbar + layout) is independently navigable and
 * verifiable. In Phase 1B this becomes a redirect to `/admin/dashboard` once
 * the dashboard route exists.
 */
export default function AdminHome() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Panel"
        title="Admin Foundation"
        subtitle="The shell is ready — the dashboard and modules arrive in the next phases."
      />

      <div className="rounded-2xl border border-dashed border-cream-3 bg-white/60 p-10 text-center">
        <p className="font-display text-lg text-ink">Foundation ready</p>
        <p className="mx-auto mt-1 max-w-prose text-sm text-ink-soft">
          The fixed sidebar, top navigation and shared admin layout are in
          place. Phase 1B adds the Dashboard; Phase 1C scaffolds each module.
        </p>
      </div>
    </div>
  );
}
