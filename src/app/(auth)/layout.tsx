import Image from "next/image";
import Link from "next/link";

/**
 * Shared shell for the auth routes (/login, /signup).
 *
 * Split layout: a maroon brand panel on the left (hidden on small screens)
 * and the form column on the right. The root layout already provides
 * <html>/<body>, so this nested layout only arranges the auth surface.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col bg-surface-beige lg:flex-row">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-maroon px-12 py-12 text-cream lg:flex lg:w-[44%] xl:w-[40%]">
        {/* Soft decorative glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cream/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-maroon-dark/60 blur-3xl"
        />

        <Link href="/" className="relative z-10 inline-flex w-fit">
          <Image
            src="/bhojpatra-logo.png"
            alt="Bhojpatra"
            width={894}
            height={226}
            priority
            className="h-14 w-auto"
          />
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-script text-3xl leading-tight text-cream xl:text-4xl">
            Plan your perfect celebration.
          </p>
          <p className="mt-4 text-base leading-relaxed text-cream/80">
            Book verified feast specialists from your city, your state, or
            across India — with transparent pricing and effortless booking.
          </p>
        </div>

        <p className="relative z-10 text-sm text-cream/60">
          India&apos;s Feast Booking Platform
        </p>
      </aside>

      {/* Form column */}
      <div className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
        {/* Mobile logo (brand panel is hidden on small screens) */}
        <Link href="/" className="mb-8 inline-flex w-fit lg:hidden">
          <Image
            src="/bhojpatra-logo.png"
            alt="Bhojpatra"
            width={894}
            height={226}
            className="h-12 w-auto"
          />
        </Link>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </main>
  );
}
