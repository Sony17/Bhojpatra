import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import SitePageView from "@/components/SitePageView";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Bhojpatra",
  description:
    "Bhojpatra's refund and cancellation policy for catering and feast bookings.",
};

export default function RefundPage() {
  return (
    <PublicShell>
      <SitePageView slug="refund" hideBar />
    </PublicShell>
  );
}
