import type { Metadata } from "next";
import PaymentTracking from "@/components/admin/payments/PaymentTracking";

export const metadata: Metadata = { title: "Payments" };

export default function PaymentsPage() {
  return <PaymentTracking />;
}
