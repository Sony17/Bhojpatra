"use client";

import Image from "next/image";
import Link from "next/link";
import { isUnoptimized } from "@/lib/homeContent";

export type Tile = { id: string; name: string; image: string; href: string; sub?: string };

/**
 * One row of square-cornered photo tiles with a View all tile at the end.
 *
 * - `overlay` (occasions): the name sits centred on the photo.
 * - `caption` (brands): the photo, then the name and an optional sub-line.
 *
 * Desktop shows five tiles; phones show a row of round thumbnails with the
 * name underneath, food-app style, that scrolls sideways.
 */
export default function TileRow({
  tiles,
  viewAll,
  variant = "overlay",
}: {
  tiles: Tile[];
  viewAll: { href: string; label: string };
  variant?: "overlay" | "caption";
}) {
  const shown = tiles.slice(0, 5);
  return (
    <>
      {/* Phones */}
      <ul className="-mx-4 mt-5 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {shown.map((tile) => (
          <li key={tile.id} className="w-[4.5rem] shrink-0">
            <Link href={tile.href} className="flex flex-col items-center gap-1.5 text-center">
              <span className="relative block h-16 w-16 overflow-hidden rounded-full bg-cream ring-2 ring-cream">
                {tile.image && (
                  <Image src={tile.image} alt="" fill sizes="64px" className="object-cover" unoptimized={isUnoptimized(tile.image)} />
                )}
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-black">{tile.name}</span>
            </Link>
          </li>
        ))}
        <li className="w-[4.5rem] shrink-0">
          <Link href={viewAll.href} className="flex flex-col items-center gap-1.5 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border border-dashed border-maroon/40 text-maroon">
              <GridIcon />
            </span>
            <span className="text-[11px] font-semibold leading-tight text-maroon">{viewAll.label}</span>
          </Link>
        </li>
      </ul>

      {/* Desktop */}
      <ul className="mt-8 hidden grid-cols-[repeat(5,minmax(0,1fr))_8.5rem] gap-4 lg:grid">
        {shown.map((tile) => (
          <li key={tile.id}>
            <Link
              href={tile.href}
              className="group block border border-cream bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_24px_-18px_rgba(0,0,0,0.3)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_22px_36px_-22px_rgba(185,32,37,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
            >
              <span className={"relative block w-full overflow-hidden bg-maroon " + (variant === "overlay" ? "aspect-[4/3]" : "aspect-[16/10]")}>
                {tile.image && (
                  <Image
                    src={tile.image}
                    alt=""
                    fill
                    sizes="220px"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    unoptimized={isUnoptimized(tile.image)}
                  />
                )}
                {variant === "overlay" && (
                  <>
                    <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <span className="absolute inset-x-2 bottom-2.5 text-center text-[15px] font-semibold leading-tight text-white drop-shadow-sm">
                      {tile.name}
                    </span>
                  </>
                )}
              </span>
              {variant === "caption" && (
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-sm font-semibold text-black">{tile.name}</span>
                  {tile.sub && <span className="mt-0.5 block truncate text-xs text-black/60">{tile.sub}</span>}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={viewAll.href}
            className="group flex h-full flex-col items-center justify-center gap-2 border border-dashed border-maroon/40 bg-white px-3 text-center text-sm font-semibold text-maroon transition-colors hover:border-maroon hover:bg-cream/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
          >
            <GridIcon />
            <span className="inline-flex items-center gap-1">
              {viewAll.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-6 w-6" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1" />
    </svg>
  );
}
