/**
 * Tiny classNames joiner for the design system. Filters out falsy values so
 * components can write `cn("base", cond && "extra", props.className)`.
 * (No tailwind-merge dependency — primitives expose styling via variant/size
 * props, and `className` is reserved for layout tweaks that don't conflict.)
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
