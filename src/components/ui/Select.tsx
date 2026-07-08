"use client";

import ThemedSelect, { type ThemedSelectOption } from "@/components/ThemedSelect";
import { cn } from "./cn";
import { controlClass } from "./Input";

export type { ThemedSelectOption };

/**
 * App-wide select. Wraps the existing accessible {@link ThemedSelect} (keyboard
 * nav, on-brand cream/red popup) but gives its trigger the same `controlClass`
 * styling as text inputs, so selects and inputs are visually identical.
 */
export function Select({
  buttonClassName,
  ...rest
}: React.ComponentProps<typeof ThemedSelect>) {
  return (
    <ThemedSelect
      {...rest}
      buttonClassName={cn(controlClass, "pr-10", buttonClassName)}
    />
  );
}

export default Select;
