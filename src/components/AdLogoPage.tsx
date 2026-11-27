import Image from "next/image";
import AdFooter from "@/components/AdFooter";

/**
 * Ad landing page shell: the Bhojpatra logo, then the ad footer.
 * Shared by /baina-ad, /vendor-ad, /venue-ad and /catering-ad until each
 * page gets its own content.
 */
export default function AdLogoPage() {
  return (
    <>
      <main className="flex items-center justify-center bg-white px-4 py-20 lg:py-28">
        <Image
          src="/bhojpatra-logo.png"
          alt="Bhojpatra"
          width={894}
          height={226}
          priority
          className="h-auto w-[min(80vw,360px)]"
        />
      </main>
      <AdFooter />
    </>
  );
}
