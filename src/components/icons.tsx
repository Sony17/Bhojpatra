import type { SVGProps } from "react";

/* Thin line icons (1.5 stroke) matching the Bhojpatra mockup. */
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function ShieldCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 5 6v5c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function PriceTag(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 12V4h8l9 9-8 8-9-9Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  );
}

export function Compare(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v16" />
      <path d="M5 8 2 13h6L5 8Z" />
      <path d="M19 8l-3 5h6l-3-5Z" />
      <path d="M5 4h14" />
    </svg>
  );
}

export function Calendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function Headset(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <path d="M4 13v3a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2Z" />
      <path d="M20 13v3a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 0Z" />
      <path d="M18 18v1a3 3 0 0 1-3 3h-3" />
    </svg>
  );
}

export function Users(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1" />
      <circle cx="9.5" cy="8" r="3" />
      <path d="M21 19v-1a4 4 0 0 0-3-3.8" />
      <path d="M15 5.2a3 3 0 0 1 0 5.6" />
    </svg>
  );
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function UserHeart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20v-1a5 5 0 0 1 5-5h2" />
      <path d="M18.5 13.2c1 .9 2.5 1 2.5 2.6 0 1.4-2.5 3.2-2.5 3.2S16 17.2 16 15.8c0-1.6 1.5-1.7 2.5-2.6Z" />
    </svg>
  );
}

export function Star(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  );
}

export function StarSolid(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9 6.8 19.2l1-5.8L3.5 9.2l5.9-.9L12 3Z" />
    </svg>
  );
}

export function ChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ── How It Works step icons ───────────────────────────────── */

/* Diya / oil lamp — "Choose Occasion". */
export function Diya(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 14c1.5 1.5 4.7 2.5 8 2.5s6.5-1 8-2.5c0 2.5-3.6 4-8 4s-8-1.5-8-4Z" />
      <path d="M12 11c1.6 0 2.6 1 2.6 2.2H9.4C9.4 12 10.4 11 12 11Z" />
      <path d="M12 11c0-1.4-1.2-1.8-1.2-3 0-.9.7-1.5 1.2-2 .5.5 1.2 1.1 1.2 2 0 1.2-1.2 1.6-1.2 3Z" />
    </svg>
  );
}

/* Chef hat — "Select Package". */
export function ChefHat(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 14a4 4 0 0 1-1-7.9A4 4 0 0 1 13.6 4 4 4 0 0 1 18 6.1 4 4 0 0 1 17 14" />
      <path d="M7 14v4.5A1.5 1.5 0 0 0 8.5 20h7a1.5 1.5 0 0 0 1.5-1.5V14" />
      <path d="M9.5 14v3M14.5 14v3" />
    </svg>
  );
}

/* Person with a sparkle — "Choose Specialists". */
export function UserStar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 2.4.6" />
      <path d="M18 12.5 18.8 14.4 20.8 14.6 19.3 16 19.7 18 18 17 16.3 18 16.7 16 15.2 14.6 17.2 14.4 18 12.5Z" />
    </svg>
  );
}

/* Clipboard with a check — "Finalize & Book". */
export function ClipboardCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="5" width="14" height="16" rx="2" />
      <path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

/* Small clay pot (matka) used as the brand mark / the "o" in bhoj. */
export function Pot(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        d="M8.5 6.2c0-.7.7-1.2 1.5-1.2h4c.8 0 1.5.5 1.5 1.2 0 .5-.3.9-.8 1.1 2 .8 3.3 2.7 3.3 5 0 3-2.7 5.2-6 5.2s-6-2.2-6-5.2c0-2.3 1.3-4.2 3.3-5-.5-.2-.8-.6-.8-1.1Z"
        fill="currentColor"
      />
      <path d="M9 9.2h6" stroke="var(--color-gold-soft)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
