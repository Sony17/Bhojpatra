import { cn } from "./cn";

/**
 * Loading placeholder block. Compose several to skeleton a card/row while data
 * loads (Swiggy-style). Uses the brand cream tint + the built-in pulse.
 */
export default function Skeleton({
  className,
  rounded = "card",
}: {
  className?: string;
  rounded?: "card" | "control" | "full" | "none";
}) {
  const radius =
    rounded === "full"
      ? "rounded-full"
      : rounded === "control"
        ? "rounded-control"
        : rounded === "none"
          ? ""
          : "rounded-card";
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse bg-cream-3/70", radius, className)}
    />
  );
}
