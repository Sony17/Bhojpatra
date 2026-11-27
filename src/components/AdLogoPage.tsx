import Image from "next/image";

/**
 * Blank ad landing page: just the Bhojpatra logo, centred on white.
 * Shared by /baina-ad, /vendor-ad, /venue-ad and /catering-ad until each
 * page gets its own content.
 */
export default function AdLogoPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4">
      <Image
        src="/bhojpatra-logo.png"
        alt="Bhojpatra"
        width={894}
        height={226}
        priority
        className="h-auto w-[min(80vw,360px)]"
      />
    </main>
  );
}
