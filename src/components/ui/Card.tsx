import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/** Link/anchor attributes so <Card as={Link} href="…"> and <Card as="a"> work. */
type LinkableProps = {
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean | string;
};

/**
 * The one Card. Soft food-app surface: `rounded-hero` (24px) by default,
 * minimal border, soft shadow. Set `interactive` for hover-lift (links /
 * selectable items). Prefer ListingCard for media catalogs.
 *
 * `padding`: none | sm (p-4) | md (p-5, default) | lg (p-6 → p-7 on sm+).
 */
type CardProps = {
  as?: ElementType;
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
} & LinkableProps &
  Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

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
        "rounded-hero border border-maroon/6 bg-white shadow-card",
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
