import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import Badge from "./Badge";

/**
 * Media listing card — vendors / venues / packages. Large rounded food imagery,
 * soft shadow, minimal border. The whole card is the hit target.
 */
export default function ListingCard({
  href,
  image,
  imageAlt,
  title,
  subtitle,
  meta,
  price,
  priceNote,
  badges,
  footer,
  className,
  priority = false,
}: {
  href: string;
  image: string;
  imageAlt: string;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  price?: string;
  priceNote?: string;
  badges?: ReactNode;
  footer?: ReactNode;
  className?: string;
  priority?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-hero border border-maroon/6 bg-white shadow-card transition duration-200 hover:shadow-pop",
        className,
      )}
    >
      <Link
        href={href}
        className="focus-ring absolute inset-0 z-0 rounded-hero"
        aria-label={title}
      />
      {/* Photo, veil and badges are decorative and sit *after* the link in DOM
          order, so without this they'd win the hit test and swallow every tap
          on the top two-thirds of the card — leaving only the text strip
          tappable. `pointer-events-none` lets taps fall through to the link. */}
      <div className="pointer-events-none relative aspect-[4/3] overflow-hidden bg-cream">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-300 ease-out group-hover:scale-[1.03]"
        />
        <div aria-hidden="true" className="media-veil absolute inset-0" />
        {badges && (
          <div className="absolute left-3 top-3 z-[1] flex flex-wrap gap-1.5">
            {badges}
          </div>
        )}
      </div>
      <div className="relative z-[1] space-y-1.5 p-4 pointer-events-none">
        <h3 className="line-clamp-1 text-[15px] font-bold tracking-tight text-ink sm:text-base">
          {title}
        </h3>
        {subtitle && (
          <p className="line-clamp-1 text-caption text-ink/55">{subtitle}</p>
        )}
        {meta}
        {(price || priceNote) && (
          <div className="flex items-baseline gap-1.5 pt-1">
            {price && (
              <span className="text-[15px] font-bold text-maroon">{price}</span>
            )}
            {priceNote && (
              <span className="text-caption text-ink/45">{priceNote}</span>
            )}
          </div>
        )}
        {footer && <div className="pointer-events-auto pt-2">{footer}</div>}
      </div>
    </article>
  );
}

export function ListingBadge({
  children,
  tone = "solid",
}: {
  children: ReactNode;
  tone?: "solid" | "soft" | "outline";
}) {
  return (
    <Badge tone={tone} className="shadow-soft backdrop-blur-sm">
      {children}
    </Badge>
  );
}
