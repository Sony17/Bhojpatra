"use client";

import Image from "next/image";
import Link from "next/link";
import CreamLogo from "@/components/CreamLogo";
import { useLang } from "@/lib/i18n";

/**
 * Shared shell for the auth routes (/login, /signup).
 *
 * Split layout: a maroon brand panel on the right (hidden on small screens)
 * and the form column on the left. The root layout already provides
 * <html>/<body>, so this nested layout only arranges the auth surface.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useLang();
  return (
    <main className="flex min-h-screen flex-col bg-surface-beige lg:flex-row-reverse">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-maroon px-12 py-12 text-cream lg:flex lg:w-[44%] xl:w-[40%]">
        {/* Background imagery */}
        <Image
          src="/login.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 40vw, 44vw"
          className="pointer-events-none object-cover"
        />
        {/* Maroon overlay for text legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-maroon/65 via-maroon/45 to-maroon-dark/75"
        />

        <Link href="/" target="_blank" rel="noopener noreferrer" className="relative z-10 inline-flex w-fit">
          <CreamLogo src="/bhojpatra-logo1.png" className="h-24 w-[81px]" />
        </Link>

        <div className="relative z-10 max-w-md">
          <p className="font-display text-3xl leading-tight text-cream xl:text-4xl">
            {t(
              "Plan your perfect celebration.",
              "अपना उत्तम समारोह योजना बनाएं।"
            )}
          </p>
          <p className="mt-4 text-base leading-relaxed text-cream/80">
            {t(
              "Book verified feast specialists from your city, your state, or across India — with transparent pricing and effortless booking.",
              "अपने शहर, अपने राज्य या पूरे भारत से सत्यापित भोज विशेषज्ञ बुक करें — पारदर्शी मूल्य और आसान बुकिंग के साथ।"
            )}
          </p>
        </div>

        <p className="relative z-10 text-sm text-cream/60">
          {t(
            "India's Feast Booking Platform",
            "भारत का भोज बुकिंग प्लेटफॉर्म"
          )}
        </p>
      </aside>

      {/* Form column */}
      <div className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
        {/* Mobile logo (brand panel is hidden on small screens) */}
        <Link href="/" target="_blank" rel="noopener noreferrer" className="mb-8 inline-flex w-fit lg:hidden">
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
