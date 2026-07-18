import type { Metadata } from "next";
import SupportTickets from "@/components/admin/support/SupportTickets";

export const metadata: Metadata = { title: "Support Tickets" };

export default function SupportPage() {
  return <SupportTickets />;
}
