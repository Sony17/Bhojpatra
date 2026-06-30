"use client";

import Image from "next/image";
import Link from "next/link";
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
      <aside className="relative hidden flex-col justify-end overflow-hidden bg-maroon px-12 py-12 text-cream lg:flex lg:w-[44%] xl:w-[40%]">
        {/* Background imagery — keeps its own color */}
        <Image
          src="/login.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 40vw, 44vw"
          className="pointer-events-none object-cover"
        />
        {/* Red overlay that fades up from the bottom — merges the text into the image
            while the upper image retains its own color */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-maroon via-maroon/80 to-transparent"
        />

        {/* All copy as a single paragraph, anchored to the bottom of the image */}
        <p className="relative z-10 max-w-md text-base leading-relaxed text-cream">
          {t(
            "Plan your perfect celebration. Book verified feast specialists from your city, your state, or across India — with transparent pricing and effortless booking. India's Feast Booking Platform.",
            "अपना उत्तम समारोह योजना बनाएं। अपने शहर, अपने राज्य या पूरे भारत से सत्यापित भोज विशेषज्ञ बुक करें — पारदर्शी मूल्य और आसान बुकिंग के साथ। भारत का भोज बुकिंग प्लेटफॉर्म।"
          )}
        </p>
      </aside>

      {/* Form column */}
      <div className="flex flex-1 flex-col px-5 py-8 sm:px-8 lg:py-12">
        {/* Logo + form centered together as one block, logo directly above the form */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <Link href="/" target="_blank" rel="noopener noreferrer" className="mb-10 inline-flex w-fit">
            <Image
              src="/bhojpatra-logo.png"
              alt="Bhojpatra"
              width={894}
              height={226}
              className="h-20 w-auto"
            />
          </Link>

          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </main>
  );
}
