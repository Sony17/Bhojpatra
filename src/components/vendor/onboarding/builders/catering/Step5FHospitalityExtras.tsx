"use client";

import type { VendorCounter } from "@/lib/vendorMenus";
import CatalogBuilderStep, { type CatalogIdea } from "./CatalogBuilderStep";
import { isExtraOffering } from "./CounterModal";

interface Step5FHospitalityExtrasProps {
  counters: VendorCounter[];
  onChangeCounters: (counters: VendorCounter[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: "💡 Popular Extras Ideas". Sound & DJ has no platform offering yet. */
const IDEAS: CatalogIdea[] = [
  { id: "mocktail", icon: "🍹", name: "Welcome Drinks & Mocktails", mName: "Mocktails", rate: 65, desc: "Live botanical coolers, fresh fruit punches, and spiced mojitos.", mDesc: "Live botanical coolers & juices" },
  { id: "hi-tea", icon: "🫖", name: "Hi-Tea & Evening Snacks", mName: "Hi-Tea", rate: 75, desc: "Barista tea/coffee bar with hot cocktail samosas and artisanal cookies.", mDesc: "Barista tea/coffee & snacks" },
  { id: "decor", icon: "🎉", name: "Buffet Floral & Theme Decor", mName: "Floral Decor", rate: 35000, flat: true, desc: "Marigold garlands, warm spotlighting, and brass decor props.", mDesc: "Marigold & brass props" },
  { icon: "🔊", name: "Banquet Sound & Announcements", mName: "Sound & DJ", rate: 15000, flat: true, desc: "Professional wireless PA system, ambient instrumental music, and microphones.", mDesc: "Wireless PA & ambient sound" },
];

export default function Step5FHospitalityExtras(props: Step5FHospitalityExtrasProps) {
  return (
    <CatalogBuilderStep
      {...props}
      mode="service"
      belongs={isExtraOffering}
      heading={{
        eyebrow: "Feast Menu Builder · Hospitality Extras",
        heading: "Configure feast hospitality extras",
        subtext: "Add and manage optional hospitality additions, decor, and beverages for feast bookings.",
        mEyebrow: "Feast Extras",
        mHeading: "Hospitality Extras",
      }}
      catalogTitle="✨ Feast Hospitality Extras"
      mCatalogTitle="✨ Feast Extras"
      catalogSub="Curate the special hospitality additions you provide."
      addLabel="＋ Add Feast Extra"
      mAddLabel="＋ Add Extra"
      ideasTitle="💡 Popular Extras Ideas (Click to customize & add to your catalog):"
      mIdeasTitle="💡 Popular Ideas (Tap to customize):"
      ideas={IDEAS}
    />
  );
}
