import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui";
import ScrollWatermark from "@/components/ScrollWatermark";
import SiteLoader from "@/components/SiteLoader";

/* The Bhojpatra brand uses exactly two typefaces (per the brand guidelines):
   - Open Sans          → primary UI / body font
   - Ananda Neptouch 2  → branding / display font (proprietary, self-hosted)
   No other fonts allowed. */
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

/* Branding / display typeface — self-hosted Ananda Neptouch 2 (Regular).
   Path is relative to this file; the .ttf lives in /public. Open Sans is the
   swap/fallback face while it loads. */
const anandaNeptouch = localFont({
  src: "../../public/ananda-neptouch-2.regular.ttf",
  variable: "--font-brand-display",
  weight: "400",
  display: "swap",
  fallback: ["var(--font-open-sans)", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Bhojpatra — India's Feast Booking Platform",
  description:
    "Plan your perfect celebration with the best feast specialists from your city, state, or across India. Verified specialists, transparent pricing, easy booking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${openSans.variable} ${anandaNeptouch.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-white text-ink">
        <LanguageProvider>
          <ToastProvider>
            {children}
            <ScrollWatermark />
          </ToastProvider>
        </LanguageProvider>
        <SiteLoader />
      </body>
    </html>
  );
}
