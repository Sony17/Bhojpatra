import { stats } from "@/lib/data";
import { Users, MapPin, UserHeart, StarSolid } from "@/components/icons";
import CountUp from "@/components/CountUp";

const statIcons: Record<
  string,
  (props: React.SVGProps<SVGSVGElement>) => React.ReactElement
> = {
  users: Users,
  pin: MapPin,
  userHeart: UserHeart,
  star: StarSolid,
};

export default function StatsBar() {
  return (
    <div className="w-full bg-maroon text-cream">
      <div className="mx-auto max-w-7xl px-5 py-1.5 sm:py-2">
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = statIcons[stat.iconKey];
            return (
              <div
                key={stat.label}
                className={[
                  "group flex items-center justify-center gap-2 px-2 py-1 text-left sm:gap-2.5 sm:px-4",
                  i % 4 !== 0 ? "sm:border-l sm:border-cream/15" : "",
                  i % 2 === 1 ? "border-l border-cream/15 sm:border-l" : "",
                  i >= 2 ? "border-t border-cream/15 sm:border-t-0" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream/10 text-gold-soft transition-transform duration-300 group-hover:scale-110 sm:h-8 sm:w-8">
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0">
                  <dd className="font-display text-base font-bold leading-none text-gold-soft sm:text-xl">
                    <CountUp value={stat.value} />
                  </dd>
                  <dt className="mt-0.5 text-[10px] leading-tight text-cream/80 sm:text-xs">
                    {stat.label}
                  </dt>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </div>
  );
}
