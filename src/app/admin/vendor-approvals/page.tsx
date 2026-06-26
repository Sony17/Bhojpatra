import type { Metadata } from "next";
import ApprovalsConsole from "@/components/admin/approvals/ApprovalsConsole";

export const metadata: Metadata = {
  title: "Vendor Approvals",
};

export default function VendorApprovalsPage() {
  return <ApprovalsConsole />;
}
