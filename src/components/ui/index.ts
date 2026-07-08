/**
 * Bhojpatra design system — single import surface.
 *
 *   import { Button, Card, Input, Badge, Chip, Section } from "@/components/ui";
 *
 * Every screen (public site, booking, dashboards, admin) should build from
 * these primitives so buttons, cards, inputs, badges, spacing, radius, shadow
 * and motion are identical everywhere. All render strictly in the four brand
 * colours.
 */
export { cn } from "./cn";

export { default as Button } from "./Button";
export type { ButtonVariant, ButtonSize } from "./Button";

export { default as Card } from "./Card";

export { Input, Textarea, Field, controlClass } from "./Input";
export { Select } from "./Select";
export type { ThemedSelectOption } from "./Select";

export { default as Badge, StatusBadge } from "./Badge";
export type { BadgeTone } from "./Badge";

export { default as Chip } from "./Chip";

export { default as SegmentedControl } from "./SegmentedControl";
export type { SegmentOption } from "./SegmentedControl";

export { Section, Container } from "./Section";

export { Stepper, ProgressBar } from "./Stepper";

export { default as Skeleton } from "./Skeleton";
export { default as Spinner } from "./Spinner";

export { ToastProvider, useToast } from "./Toast";

export { default as Drawer } from "./Drawer";
