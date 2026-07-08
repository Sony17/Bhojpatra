import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

/**
 * Layout primitives that enforce ONE page skeleton across the app: a centred
 * max-width column with consistent gutters (`px-5 sm:px-8`) and a consistent
 * vertical rhythm. Wrapping page bodies in <Section>/<Container> is what makes
 * every screen line up on the same grid.
 */
type Size = "sm" | "md" | "lg" | "full";

const MAXW: Record<Size, string> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  full: "max-w-none",
};

export function Container({
  size = "lg",
  className,
  children,
  ...rest
}: {
  size?: Size;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8", MAXW[size], className)} {...rest}>
      {children}
    </div>
  );
}

const SPACING = {
  none: "",
  sm: "py-10 sm:py-14",
  md: "py-16 sm:py-24",
  lg: "py-20 sm:py-28",
} as const;

export function Section({
  spacing = "md",
  container = true,
  size = "lg",
  className,
  children,
  ...rest
}: {
  spacing?: keyof typeof SPACING;
  /** Wrap children in a <Container>. Set false to control width yourself. */
  container?: boolean;
  size?: Size;
  className?: string;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <section className={cn(SPACING[spacing], className)} {...rest}>
      {container ? <Container size={size}>{children}</Container> : children}
    </section>
  );
}

export default Section;
