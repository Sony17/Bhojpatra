import type { Metadata } from "next";
import PublicShell from "@/components/app/PublicShell";
import HomeV2 from "@/components/homeV2/HomeV2";

export const metadata: Metadata = {
  title: "Bhojpatra — Plan, Book & Celebrate",
  description:
    "Discover trusted vendors for Baina & Gift Boxes, Catering, and Venues — all in one place.",
};

/** New home layout, served beside the classic home (`/`) for comparison. */
export default function HomeV2Page() {
  return (
    <PublicShell hero>
      <HomeV2 />
    </PublicShell>
  );
}
