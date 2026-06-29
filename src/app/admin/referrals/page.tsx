import type { Metadata } from "next";
import ReferralManagement from "@/components/admin/referrals/ReferralManagement";

export const metadata: Metadata = { title: "Referrals" };

export default function ReferralsPage() {
  return <ReferralManagement />;
}
