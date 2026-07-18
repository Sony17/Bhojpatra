import type { Metadata } from "next";
import SettlementTracking from "@/components/admin/settlements/SettlementTracking";

export const metadata: Metadata = { title: "Settlements" };

export default function SettlementsPage() {
  return <SettlementTracking />;
}
