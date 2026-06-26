import { stats } from "@/lib/data";
import { Users, MapPin, UserHeart, StarSolid } from "@/components/icons";

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
      <div className="mx-auto max-w-7xl px-5 py-6 sm:py-7">
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = statIcons[stat.iconKey];
            return (
              <div
                key={stat.label}
                className={[
                  "flex items-center justify-center gap-2.5 px-2 py-4 text-left sm:gap-3 sm:px-4",
                  i % 4 !== 0 ? "sm:border-l sm:border-cream/15" : "",
                  i % 2 === 1 ? "border-l border-cream/15 sm:border-l" : "",
                  i >= 2 ? "border-t border-cream/15 sm:border-t-0" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream/10 text-gold-soft sm:h-11 sm:w-11">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0">
                  <dd className="font-display text-xl font-bold leading-none text-gold-soft sm:text-3xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 text-[11px] leading-tight text-cream/80 sm:text-sm">
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
