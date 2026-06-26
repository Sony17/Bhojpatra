import type { Metadata } from "next";
import { Open_Sans, Yatra_One, Dancing_Script } from "next/font/google";
import "./globals.css";

/* Brand body typeface — Open Sans (per Bhojpatra brand guidelines). */
const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

/* Brand display typeface — Yatra One: a Devanagari-inspired Latin display
   face (shirorekha-style top bar) that approximates the proprietary
   "Ananda Neptouch 2" logo font. Self-hosted via next/font. */
const yatraOne = Yatra_One({
  variable: "--font-brand-display",
  weight: "400",
  subsets: ["latin"],
});

/* Cursive accent typeface — Dancing Script: a legible flowing script used for
   celebratory accents (e.g. the hero headline). More readable than a formal
   calligraphic face at small sizes. Self-hosted via next/font. */
const dancingScript = Dancing_Script({
  variable: "--font-script",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
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
      className={`${openSans.variable} ${yatraOne.variable} ${dancingScript.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-white text-ink">
        {children}
      </body>
    </html>
  );
}
