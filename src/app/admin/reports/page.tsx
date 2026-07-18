import type { Metadata } from "next";
import ReportsView from "@/components/admin/reports/ReportsView";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportsView />;
}
