import type { Metadata } from "next";
import RefundManagement from "@/components/admin/refunds/RefundManagement";

export const metadata: Metadata = { title: "Refunds" };

export default function RefundsPage() {
  return <RefundManagement />;
}
