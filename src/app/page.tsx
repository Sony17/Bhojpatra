import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import CampaignPopup from "@/components/CampaignPopup";
import SectionDivider from "@/components/SectionDivider";
import Hero from "@/components/sections/Hero";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
import BainaBoxes from "@/components/sections/BainaBoxes";
import Packages from "@/components/sections/Packages";
import Gallery from "@/components/sections/Gallery";
import Testimonials from "@/components/sections/Testimonials";
import PromoLeadCapture from "@/components/sections/PromoLeadCapture";

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero />
        <SectionDivider className="py-6 sm:py-8" />
        <ChooseOccasion />
        <SectionDivider className="py-6 sm:py-8" />
        {/* Beige bands alternate (base ↔ deeper) so each section reads as a
            distinct zone flowing out of the hero — never white. The base
            tone comes from the page body; alt sections sit on a full-bleed
            deeper-beige band. */}
        <div className="bg-surface-beige-2">
          <TopCategories />
        </div>
        <SectionDivider className="py-6 sm:py-8" />
        <BainaBoxes />
        <SectionDivider className="py-6 sm:py-8" />
        <Packages />
        <SectionDivider className="py-6 sm:py-8" />
        <Gallery />
        <SectionDivider className="py-6 sm:py-8" />
        <Testimonials />
        <SectionDivider className="py-6 sm:py-8" />
        <PromoLeadCapture />
      </main>
      <Footer />
      <FloatingChat />
      <CampaignPopup />
    </>
  );
}
