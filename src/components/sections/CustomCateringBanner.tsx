"use client";

import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui";

interface CustomCateringBannerProps {
  onOpenModal: () => void;
}

export default function CustomCateringBanner({ onOpenModal }: CustomCateringBannerProps) {
  const { t } = useLang();

  return (
    <section
      id="custom-catering"
      aria-label={t("Custom Catering Enquiry", "कस्टम कैटरिंग पूछताछ")}
      className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8"
    >
      <div className="relative overflow-hidden rounded-2xl border border-maroon/15 bg-gradient-to-r from-cream/40 via-cream/25 to-cream/40 p-6 shadow-soft sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-maroon/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-maroon sm:text-[11px]">
            <span aria-hidden="true">★</span>
            {t("Custom Menus & Special Budgets", "विशेष मेनू और बजट")}
          </span>

          <h2 className="mt-2.5 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {t("Have Your Own Menu or Target Budget?", "अपना मेनू या बजट है?")}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-ink/75 sm:text-base">
            {t(
              "Share your existing menu, catering brief, or budget PDF. Tell us what you need, and our team will review your requirements to help you find the appropriate catering options.",
              "अपना मौजूदा मेनू, कैटरिंग विवरण या बजट PDF साझा करें। हमें बताएं कि आपको क्या चाहिए, और हमारी टीम उपयुक्त कैटरिंग विकल्प खोजने में आपकी मदद करेगी।",
            )}
          </p>
        </div>

        <div className="mt-5 flex shrink-0 items-center gap-3 sm:mt-6 lg:mt-0">
          <Button
            variant="primary"
            size="lg"
            onClick={onOpenModal}
            className="w-full sm:w-auto"
            leftIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            }
          >
            {t("Custom Catering Enquiry", "कस्टम कैटरिंग पूछताछ")}
          </Button>
        </div>
      </div>
    </section>
  );
}
