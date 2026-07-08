import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * The one Card. Single radius (`rounded-card` = 16px), single border
 * (`border-cream-3`), single resting shadow (`shadow-card`). Set `interactive`
 * for hover-lift cards (links, selectable items) — it adds the shared
 * `.card-lift` motion and deepens to `shadow-pop`.
 *
 * `padding`: none | sm (p-4) | md (p-5, default) | lg (p-6 → p-7 on sm+).
 */
type CardProps = {
  as?: ElementType;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

const PADDING = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-7",
} as const;

export default function Card({
  as: Tag = "div",
  interactive = false,
  padding = "md",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-cream-3 bg-white shadow-card",
        PADDING[padding],
        interactive &&
          "card-lift cursor-pointer transition-shadow duration-200 hover:shadow-pop",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
