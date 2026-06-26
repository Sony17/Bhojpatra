import { heroHighlights } from "@/lib/data";
import {
  ShieldCheck,
  PriceTag,
  Compare,
  Calendar,
  Headset,
} from "@/components/icons";

const highlightIcons: Record<
  string,
  (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
> = {
  shield: ShieldCheck,
  tag: PriceTag,
  compare: Compare,
  calendar: Calendar,
  headset: Headset,
};

/**
 * The trust band: a single maroon ribbon carrying a continuously moving
 * row of trust highlights. The track holds two identical copies so the
 * -50% shift loops seamlessly; the edge mask fades items in and out at
 * the rails, and hovering the band pauses the scroll.
 */
export default function StatsBar() {
  return (
    <div className="marquee-pause w-full overflow-hidden bg-maroon py-3 [mask-image:linear-gradient(to_right,transparent,#000_6%,#000_94%,transparent)]">
      <div className="animate-marquee flex w-max gap-3 pr-3">
        {[...heroHighlights, ...heroHighlights].map((h, i) => {
          const Icon = highlightIcons[h.iconKey];
          return (
            <div
              key={`${h.title}-${i}`}
              aria-hidden={i >= heroHighlights.length}
              className="flex shrink-0 items-center gap-2 rounded-full border border-cream/20 bg-cream/10 px-4 py-2 backdrop-blur-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/15 text-gold-soft">
                <Icon className="h-4 w-4" />
              </span>
              <span className="whitespace-nowrap text-[12px] font-medium text-cream">
                {h.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
