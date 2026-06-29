"use client";

import { useLang, type Lang } from "@/lib/i18n";

/**
 * Compact EN / हिं pill toggle that flips the whole site's language.
 * Reused in the desktop header and the mobile header strip.
 */
export default function LanguageToggle({
  className = "",
}: {
  className?: string;
}) {
  const { lang, setLang } = useLang();
  const options: { id: Lang; label: string }[] = [
    { id: "en", label: "EN" },
    { id: "hi", label: "हिं" },
  ];

  return (
    <div
      role="group"
      aria-label="Language"
      className={
        "inline-flex shrink-0 items-center rounded-full border border-maroon/40 bg-white/80 p-0.5 shadow-sm backdrop-blur-sm " +
        className
      }
    >
      {options.map((o) => {
        const active = lang === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setLang(o.id)}
            aria-pressed={active}
            className={
              "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors " +
              (active
                ? "bg-maroon text-cream"
                : "text-maroon hover:bg-maroon/5")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
