"use client";

import Image from "next/image";
import Link from "next/link";
import { isUnoptimized } from "@/lib/homeContent";

export type Tile = { id: string; name: string; image: string; href: string };

/**
 * One row of wide photo tiles (name bottom-left, round arrow bottom-right)
 * with "View all" as the last tile in the same row. Desktop shows five tiles;
 * phones show about two and a half tiles and scroll the rest sideways.
 */
export default function TileRow({
  tiles,
  viewAll,
}: {
  tiles: Tile[];
  viewAll: { href: string; label: string };
}) {
  const shown = tiles.slice(0, 5);
  return (
    <ul className="-mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mt-8 lg:mx-0 lg:grid lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {shown.map((tile) => (
        <li key={tile.id} className="w-[42vw] max-w-[190px] shrink-0 snap-start lg:w-auto lg:max-w-none">
          <Link
            href={tile.href}
            className="group relative block aspect-[3/2] overflow-hidden rounded-2xl bg-maroon shadow-[0_2px_6px_rgba(0,0,0,0.06),0_14px_28px_-16px_rgba(0,0,0,0.4)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
          >
            {tile.image && (
              <Image
                src={tile.image}
                alt=""
                fill
                sizes="(min-width:1024px) 220px, 42vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                unoptimized={isUnoptimized(tile.image)}
              />
            )}
            <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span className="absolute inset-x-2.5 bottom-2.5 flex lg:inset-x-3 lg:bottom-3 items-center justify-between gap-2">
              <span className="truncate text-sm font-bold leading-tight text-white drop-shadow-sm lg:text-lg">{tile.name}</span>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-maroon lg:h-8 lg:w-8 shadow-sm transition-transform duration-200 group-hover:translate-x-0.5"
              >
                <Arrow />
              </span>
            </span>
          </Link>
        </li>
      ))}
      <li className="shrink-0 snap-start">
        <Link
          href={viewAll.href}
          className="group flex aspect-[3/2] h-full min-w-[6.5rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-maroon/30 px-4 text-center text-sm font-semibold text-maroon transition-colors hover:border-maroon hover:bg-maroon hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon lg:aspect-auto"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-maroon text-white transition-colors group-hover:bg-white group-hover:text-maroon">
            <Arrow />
          </span>
          {viewAll.label}
        </Link>
      </li>
    </ul>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
