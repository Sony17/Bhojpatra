import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import Hero from "@/components/sections/Hero";
import ChooseOccasion from "@/components/sections/ChooseOccasion";
import TopCategories from "@/components/sections/TopCategories";
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
        <ChooseOccasion />
        {/* Beige bands alternate (base ↔ deeper) so each section reads as a
            distinct zone flowing out of the hero — never white. The base
            tone comes from the page body; alt sections sit on a full-bleed
            deeper-beige band. */}
        <div className="bg-surface-beige-2">
          <TopCategories />
        </div>
        <Packages />
        <Gallery />
        <Testimonials />
        <PromoLeadCapture />
      </main>
      <Footer />
      <FloatingChat />
    </>
  );
}
