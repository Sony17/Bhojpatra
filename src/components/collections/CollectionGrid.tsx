"use client";

import Image from "next/image";
import Link from "next/link";
import SectionIntro from "@/components/SectionIntro";
import { isUnoptimized } from "@/lib/homeContent";

export interface CollectionTile {
  id: string;
  name: string;
  image: string;
  href: string;
  /** Small pill label shown when there's no `sub` line (e.g. "Book", "Explore"). */
  cta: string;
  /** Optional line under the name (e.g. "From ₹999 / plate"); replaces the pill. */
  sub?: string;
}

/**
 * Full "View all" listing for a home rail — the same portrait tiles used in the
 * marquees, laid out as a responsive grid so every occasion / category is
 * browsable on one page.
 */
export default function CollectionGrid({
  eyebrow,
  title,
  subtitle,
  tiles,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  tiles: CollectionTile[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <SectionIntro eyebrow={eyebrow} title={title} subtitle={subtitle} />

      <div className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.id}
            href={tile.href}
            aria-label={tile.name}
            className="group relative overflow-hidden border border-cream shadow-pop transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span className="relative block aspect-[3/4] w-full bg-cream">
              <Image
                src={tile.image}
                alt={tile.name}
                fill
                sizes="(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
                unoptimized={isUnoptimized(tile.image)}
              />
              <span aria-hidden className="absolute inset-0 bg-black/45" />
              <span className="media-veil absolute inset-0" />
              <span className="absolute inset-x-0 bottom-0 px-3 pb-3.5">
                <span className="block font-sans text-[14px] font-bold leading-tight text-cream sm:text-[15px]">
                  {tile.name}
                </span>
                {tile.sub ? (
                  <span className="mt-1 block text-[11px] font-medium text-cream/85">
                    {tile.sub}
                  </span>
                ) : (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-maroon shadow-sm">
                    {tile.cta}
                    <span aria-hidden>→</span>
                  </span>
                )}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
