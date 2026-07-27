"use client";

import Image from "next/image";
import Reveal from "@/components/Reveal";
import SectionIntro from "@/components/SectionIntro";
import { useLang } from "@/lib/i18n";
import {
  useHomeContent,
  isUnoptimized,
  type HomeGalleryItem,
} from "@/lib/homeContent";

export default function Gallery() {
  const { lang } = useLang();
  const { gallery } = useHomeContent();

  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[420px] w-[700px] max-w-[110vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(185,32,37,0.08),transparent_68%)] blur-3xl"
      />

      <Reveal className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionIntro
          eyebrow={lang === "hi" ? gallery.eyebrowHi : gallery.eyebrow}
          title={lang === "hi" ? gallery.headingHi : gallery.heading}
          titleEm={lang === "hi" ? gallery.headingEmHi : gallery.headingEm}
          subtitle={lang === "hi" ? gallery.subtitleHi : gallery.subtitle}
        />
      </Reveal>

      <div className="mt-8 space-y-3 sm:mt-10 sm:space-y-4">
        {[
          { row: gallery.rowOne, reverse: false },
          { row: gallery.rowTwo, reverse: false },
        ].map(({ row, reverse }, idx) => (
          <div
            key={idx}
            className="marquee-pause relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]"
          >
            <div
              className="flex w-max motion-reduce:!animate-none"
              style={{
                animation: `bp-marquee ${idx === 0 ? 42 : 55}s linear infinite`,
                animationDirection: reverse ? "reverse" : "normal",
              }}
            >
              {[...row, ...row].map((item: HomeGalleryItem, i: number) => (
                <div
                  key={`${item.id}-${i}`}
                  className="group relative aspect-[4/5] w-[7.15rem] shrink-0 overflow-hidden rounded-card shadow-card ring-1 ring-maroon/10 mr-2 sm:mr-2.5 sm:w-[8.8rem] lg:w-[11rem]"
                >
                  {item.image && (
                    <Image
                      src={item.image}
                      alt={i < row.length ? item.title : ""}
                      fill
                      sizes="(min-width:1024px) 176px, (min-width:640px) 141px, 114px"
                      loading="eager"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-105"
                      unoptimized={isUnoptimized(item.image)}
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-black/45"
                  />
                  <span
                    aria-hidden="true"
                    className="media-veil pointer-events-none absolute inset-0"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5">
                    <p className="text-[11px] font-semibold leading-snug text-cream sm:text-xs">
                      {lang === "hi" ? item.titleHi : item.title}
                    </p>
                    <p className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.14em] text-cream/70 sm:text-[10px]">
                      {lang === "hi" ? item.captionHi : item.caption}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
