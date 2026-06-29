"use client";

import { navLinks } from "@/lib/data";
import { useLang } from "@/lib/i18n";

export default function Footer() {
  const { lang, t } = useLang();
  return (
    <footer className="bg-maroon-dark pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-cream/80 lg:pb-0">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-bold text-cream">
              bhoj<span className="text-cream">·</span>patra
            </p>
            <p className="mt-2 max-w-xs text-sm text-cream/60">
              {t(
                "India's feast booking platform. Different specialists, one celebration.",
                "भारत का फ़ीस्ट बुकिंग प्लेटफ़ॉर्म। अलग-अलग स्पेशलिस्ट, एक उत्सव।",
              )}
            </p>
            <p className="mt-3 text-sm text-cream/70">@bhojpatraofficial</p>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">{t("Explore", "एक्सप्लोर")}</p>
            <ul className="space-y-2 text-sm">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-cream">
                    {lang === "hi" ? link.labelHi : link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">{t("Company", "कंपनी")}</p>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="hover:text-cream">{t("About Us", "हमारे बारे में")}</a></li>
              <li><a href="/careers" className="hover:text-cream">{t("Careers", "करियर")}</a></li>
              <li><a href="/contact" className="hover:text-cream">{t("Contact", "संपर्क")}</a></li>
              <li><a href="/terms" className="hover:text-cream">{t("Terms & Privacy", "नियम और गोपनीयता")}</a></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">{t("Get in touch", "संपर्क करें")}</p>
            <p className="text-sm text-cream/70">info@bhojpatra.com</p>
            <p className="mt-1 text-sm text-cream/70">+91 12345 67890</p>
            <p className="mt-1 text-sm text-cream/70">www.bhojpatra.com</p>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Bhojpatra. {t("All rights reserved.", "सर्वाधिकार सुरक्षित।")}
        </div>
      </div>
    </footer>
  );
}
