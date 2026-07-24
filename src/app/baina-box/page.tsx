import type { Metadata } from "next";
import BainaBoxOverview from "@/components/vendors/BainaBoxOverview";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Baina Box & Sweet Box Marketplace — Bhojpatra",
  description:
    "Explore premium Baina Boxes, mithai gift hampers, and festive sweet packages from Lucknow's iconic brands like Ram Asrey, Chhappan Bhog, and Hazelnut Factory.",
};

export default function BainaBoxOverviewPage() {
  return <BainaBoxOverview />;
}
