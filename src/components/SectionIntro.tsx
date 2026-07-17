import type { ReactNode } from "react";

/**
 * Shared homepage section header — one job: establish hierarchy before content.
 * Eyebrow (Open Sans) → display title (Ananda) → short lede (Open Sans).
 */
export default function SectionIntro({
  eyebrow,
  title,
  titleEm,
  subtitle,
  align = "center",
  tone = "default",
  children,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  /** Optional second phrase rendered in ink (or cream on maroon bands). */
  titleEm?: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
  tone?: "default" | "on-maroon" | "on-cream";
  children?: ReactNode;
  className?: string;
}) {
  const isMaroon = tone === "on-maroon";
  const alignCls = align === "left" ? "text-left" : "mx-auto text-center";
  const eyebrowCls = isMaroon ? "text-cream/80" : "text-maroon";
  const titleCls = isMaroon ? "text-cream" : "text-maroon";
  const emCls = isMaroon ? "text-cream" : "text-ink";
  const subCls = isMaroon ? "text-cream/75" : "text-ink/70";

  return (
    <header className={`${alignCls} max-w-2xl ${className}`}>
      {eyebrow ? (
        <p
          className={`eyebrow mb-3.5 inline-flex items-center gap-3 text-[10px] font-semibold tracking-[0.26em] ${eyebrowCls}`}
        >
          <span
            aria-hidden
            className={`h-px w-6 ${isMaroon ? "bg-cream/70" : "bg-maroon/50"}`}
          />
          {eyebrow}
        </p>
      ) : null}
      <h2 className={`font-display text-title ${titleCls}`}>
        {title}
        {titleEm != null && titleEm !== "" ? (
          <>
            {" "}
            <span className={`not-italic ${emCls}`}>{titleEm}</span>
          </>
        ) : null}
      </h2>
      {subtitle ? (
        <p className={`font-script mx-auto mt-4 max-w-lg text-subtitle ${subCls} ${align === "left" ? "mx-0" : ""}`}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}
