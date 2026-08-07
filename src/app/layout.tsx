import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/ui";
import ScrollWatermark from "@/components/ScrollWatermark";
import ScrollToTop from "@/components/ScrollToTop";
import SiteLoader from "@/components/SiteLoader";
import PwaRegister from "@/components/PwaRegister";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import { brand } from "@/lib/design-tokens";

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
  applicationName: "Bhojpatra",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bhojpatra",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/bhojpatra-icon.png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

/** PWA / mobile viewport — cover safe areas for notch devices. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: brand.red },
    { media: "(prefers-color-scheme: dark)", color: brand.black },
  ],
  colorScheme: "light dark",
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
      <head>
        {/* Chrome can fire `beforeinstallprompt` before React hydrates. Stash it
            (and cancel the browser's own mini-infobar) so InstallAppPrompt can
            show the branded card instead, whenever it mounts. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__bpInstallPrompt=e;});",
          }}
        />
      </head>
      <body className="flex min-h-full flex-col overflow-x-hidden bg-bg text-ink">
        <LanguageProvider>
          <ToastProvider>
            <ScrollToTop />
            {children}
            <ScrollWatermark />
          </ToastProvider>
          {/* Inside the provider — the prompt is bilingual. */}
          <InstallAppPrompt />
        </LanguageProvider>
        <SiteLoader />
        <PwaRegister />
      </body>
    </html>
  );
}
