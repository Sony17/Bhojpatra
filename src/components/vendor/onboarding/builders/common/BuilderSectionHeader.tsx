"use client";

interface BuilderSectionHeaderProps {
  badge?: string;
  title: string;
  description: string;
  tip?: string;
}

export default function BuilderSectionHeader({
  badge,
  title,
  description,
  tip,
}: BuilderSectionHeaderProps) {
  return (
    <div className="space-y-1.5 pb-4 border-b border-cream-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        {badge && (
          <span className="inline-flex items-center rounded-pill bg-maroon/10 px-2.5 py-0.5 text-xs font-semibold text-maroon">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs sm:text-sm text-ink-soft leading-relaxed max-w-3xl">
        {description}
      </p>
      {tip && (
        <div className="mt-2 flex items-start gap-2 rounded-control bg-cream-2/70 p-2.5 text-xs text-ink-soft leading-normal">
          <span className="text-maroon font-bold text-sm shrink-0">💡</span>
          <span>{tip}</span>
        </div>
      )}
    </div>
  );
}
