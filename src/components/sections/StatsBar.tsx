import { stats, heroHighlights } from "@/lib/data";
import {
  Users,
  MapPin,
  UserHeart,
  StarSolid,
  ShieldCheck,
  PriceTag,
  Compare,
  Calendar,
  Headset,
} from "@/components/icons";

const ribbonIcons: Record<
  string,
  (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
> = {
  users: Users,
  pin: MapPin,
  userHeart: UserHeart,
  star: StarSolid,
  shield: ShieldCheck,
  tag: PriceTag,
  compare: Compare,
  calendar: Calendar,
  headset: Headset,
};

// One scrolling track carrying the headline stats first, then the trust
// highlights. Stats keep their value (e.g. "10,000+"); highlights are
// value-less. No rounded pill — just icon + text on the maroon band.
const ribbonItems = [
  ...stats.map((s) => ({ value: s.value, label: s.label, iconKey: s.iconKey })),
  ...heroHighlights.map((h) => ({ value: "", label: h.title, iconKey: h.iconKey })),
];

/**
 * The trust band: a single maroon ribbon carrying a continuously moving
 * row of stats and trust highlights. The track holds two identical copies
 * so the -50% shift loops seamlessly; the edge mask fades items in and out
 * at the rails, and hovering the band pauses the scroll. A small square dot
 * separates each item from the next.
 */
export default function StatsBar() {
  return (
    <div className="marquee-pause w-full overflow-hidden bg-maroon py-3.5 [mask-image:linear-gradient(to_right,transparent,#000_5%,#000_95%,transparent)]">
      <div className="animate-marquee flex w-max items-center gap-5 pr-5">
        {[...ribbonItems, ...ribbonItems].map((item, i) => {
          const Icon = ribbonIcons[item.iconKey];
          return (
            <div key={`${item.label}-${i}`} className="flex shrink-0 items-center gap-5">
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cream/10 text-gold-soft">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="whitespace-nowrap text-[11px] leading-tight text-cream sm:text-[13px]">
                  {item.value && (
                    <span className="font-display font-bold text-gold-soft">
                      {item.value}{" "}
                    </span>
                  )}
                  <span className="font-medium">{item.label}</span>
                </span>
              </div>
              {/* Square dot separating one item from the next. */}
              <span
                aria-hidden
                className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold-soft/70"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
