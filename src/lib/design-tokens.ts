/**
 * Bhojpatra app design tokens — single source of truth for the mobile-first PWA.
 *
 * Every semantic role resolves to one of the four brand hexes (or alpha thereof).
 * Use CSS variables from globals.css in components; this module is for JS/TS
 * (manifest themeColor, inline styles, docs).
 */

export const brand = {
  red: "#B92025",
  cream: "#F0D09E",
  black: "#000000",
  white: "#FFFFFF",
} as const;

/** Semantic roles — dark-mode compatible via CSS vars, brand-constrained. */
export const semantic = {
  background: "var(--color-bg)",
  surface: "var(--color-surface)",
  surfaceRaised: "var(--color-surface-raised)",
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary)",
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  error: "var(--color-error)",
  ink: "var(--color-ink)",
  inkMuted: "var(--color-ink-muted)",
  border: "var(--color-border)",
} as const;

/** 8-point spacing scale (px). Prefer Tailwind space-* / gap-* / p-* multiples of 2. */
export const space = {
  0: 0,
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
} as const;

/** Radius scale — mobile app feel (16–24px cards, 12px controls). */
export const radius = {
  control: 12,
  card: 16,
  sheet: 20,
  hero: 24,
  full: 9999,
} as const;

/** Motion — never exceed 300ms for interactions. */
export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
  max: 300,
  ease: [0.16, 1, 0.3, 1] as const,
} as const;

/** Touch targets */
export const touch = {
  min: 44,
  comfortable: 48,
} as const;

/** Type roles — pair with CSS `.text-hero` / `.text-app-title` / etc. */
export const type = {
  hero: "text-hero",
  title: "text-title",
  appTitle: "text-app-title",
  subtitle: "text-subtitle",
  body: "text-body",
  caption: "text-caption",
} as const;
