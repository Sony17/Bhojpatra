import Image from "next/image";
import PublicShell from "@/components/app/PublicShell";
import AdFooter from "@/components/AdFooter";

/**
 * Ad landing page shell: site header, the Bhojpatra logo, then the ad footer.
 * Shared by /baina-ad, /vendor-ad, /venue-ad and /catering-ad until each
 * page gets its own content.
 */
export default function AdLogoPage() {
  return (
    <PublicShell footerNode={<AdFooter tabBarPad />}>
      <div className="flex items-center justify-center px-4 py-16 lg:py-24">
        <Image
          src="/bhojpatra-logo.png"
          alt="Bhojpatra"
          width={894}
          height={226}
          priority
          className="h-auto w-[min(80vw,360px)]"
        />
      </div>
    </PublicShell>
  );
}
