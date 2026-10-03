"use client";

import type { VendorCounter } from "@/lib/vendorMenus";
import CatalogBuilderStep, { type CatalogIdea } from "./CatalogBuilderStep";
import { isLiveCounterOffering } from "./CounterModal";

interface Step5ELiveCountersProps {
  counters: VendorCounter[];
  onChangeCounters: (counters: VendorCounter[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSaveDraft?: () => void;
  saving?: boolean;
}

/** Handover: "💡 Popular Station Ideas". */
const IDEAS: CatalogIdea[] = [
  { id: "chaat", icon: "🥘", name: "Chaat Station", mName: "Chaat Station", rate: 80, desc: "Live Golgappa, Aloo Tikki, Papdi Chaat & Dahi Puri.", mDesc: "Golgappa, Aloo Tikki, Papdi Chaat", spread: ["Golgappa", "Aloo Tikki", "Papdi Chaat"] },
  { id: "live", icon: "🍳", name: "Live Tandoor & Wok", mName: "Live Tandoor & Wok", rate: 120, desc: "Seekh Kebab, Charcoal Paneer Tikka, Tandoori Roti.", mDesc: "Seekh Kebab, Paneer Tikka", spread: ["Seekh Kebab", "Paneer Tikka"] },
  { id: "pan", icon: "🍃", name: "Banarasi Paan Bar", mName: "Banarasi Paan Bar", rate: 40, desc: "Live meetha paan, chocolate paan, silver warq & mukhwas.", mDesc: "Meetha paan, chocolate paan, mukhwas", spread: ["Meetha Paan", "Chocolate Paan"] },
  { id: "pizza", icon: "🍕", name: "Wood-Fired Pizza", mName: "Wood-Fired Pizza", rate: 120, desc: "Hand-tossed thin crust artisanal pizzas baked live.", mDesc: "Artisanal pizzas baked in live oven", spread: ["Margherita", "Farmhouse"] },
  { id: "noodle", icon: "🍜", name: "Chinese Live Wok", mName: "Chinese Live Wok", rate: 85, desc: "Wok-tossed Hakka noodles, Manchurian & spicy Schezwan.", mDesc: "Hakka noodles, Manchurian, Chilli Paneer", spread: ["Hakka Noodles", "Chilli Paneer"] },
  { id: "dessert", icon: "🍨", name: "Dessert Studio", mName: "Dessert Studio", rate: 70, desc: "Live hot jalebi with rabri, malpua & seasonal halwas.", mDesc: "Hot jalebi with rabri, malpua, halwa", spread: ["Live Jalebi", "Kesar Rabri"] },
];

export default function Step5ELiveCounters(props: Step5ELiveCountersProps) {
  return (
    <CatalogBuilderStep
      {...props}
      mode="counter"
      belongs={isLiveCounterOffering}
      heading={{
        eyebrow: "Feast Menu Builder · Live Food Counters",
        heading: "Configure live food & beverage counters",
        subtext: "Build and manage the live cooking stations and beverage counters you provide for feast bookings.",
        mEyebrow: "Live Counters",
        mHeading: "Live stations",
      }}
      catalogTitle="Your Live Counters Catalog"
      mCatalogTitle="Your Live Counters"
      catalogSub="Stations you set up, staff, and prepare on-site during the celebration."
      addLabel="＋ Add Live Counter"
      mAddLabel="＋ Add Counter"
      ideasTitle="💡 Popular Station Ideas (Click to customize & add to your catalog):"
      mIdeasTitle="💡 Popular Ideas (Tap to customize):"
      ideas={IDEAS}
    />
  );
}
