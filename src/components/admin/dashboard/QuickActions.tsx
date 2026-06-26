import Link from "next/link";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import { adminIcon } from "@/components/admin/shared/iconMap";
import { ArrowRight } from "@/components/admin/shared/icons";
import type { QuickAction } from "@/lib/admin/types";

/**
 * Quick-actions widget. Pure presentation — receives the typed action list and
 * renders a vertical stack of links, resolving each icon from its data key.
 */
interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export default function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <WidgetCard title="Quick Actions" className={className}>
      <div className="grid grid-cols-1 gap-2.5">
        {actions.map((a) => {
          const Icon = adminIcon[a.iconKey];
          return (
            <Link
              key={a.label}
              href={a.href}
              className="group flex items-center gap-3 rounded-xl border border-cream-3 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-maroon/40 hover:bg-cream-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cream text-maroon">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{a.label}</span>
              <ArrowRight className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </WidgetCard>
  );
}
