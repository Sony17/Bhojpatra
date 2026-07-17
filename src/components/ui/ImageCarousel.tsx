"use client";

import Image from "next/image";
import { useRef, useState, useEffect, type ReactNode } from "react";
import { cn } from "./cn";

export type CarouselSlide = {
  src: string;
  alt: string;
};

/**
 * Horizontal snap carousel for food / venue galleries. Lazy-loads offscreen
 * slides, dots for position, large rounded frame.
 */
export default function ImageCarousel({
  slides,
  className,
  aspect = "aspect-[16/10]",
  rounded = "rounded-hero",
  overlay,
  priorityFirst = true,
}: {
  slides: CarouselSlide[];
  className?: string;
  aspect?: string;
  rounded?: string;
  overlay?: ReactNode;
  priorityFirst?: boolean;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
      setIndex(Math.min(slides.length - 1, Math.max(0, i)));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [slides.length]);

  if (slides.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scroller}
        className={cn(
          "no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth",
          rounded,
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label="Gallery"
      >
        {slides.map((slide, i) => (
          <div
            key={`${slide.src}-${i}`}
            className={cn("relative w-full shrink-0 snap-center overflow-hidden bg-cream", aspect)}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={priorityFirst && i === 0}
              loading={i === 0 ? undefined : "lazy"}
              sizes="(max-width: 768px) 100vw, 720px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
      {overlay}
      {slides.length > 1 && (
        <div
          className="absolute bottom-3 left-0 right-0 z-[1] flex justify-center gap-1.5"
          aria-hidden="true"
        >
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === index ? "w-4 bg-cream" : "w-1.5 bg-white/55",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
