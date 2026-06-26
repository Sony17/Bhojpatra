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

export function Phone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3.5h3l1.5 4-2 1.4a11 11 0 0 0 5 5l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </svg>
  );
}

export function Mail(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </svg>
  );
}

export function Clock(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
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
      {/* flame */}
      <path d="M12 5.5c1.6 1.8 2.4 3.1 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.5.8-2.8 2.4-4.6Z" />
      {/* lamp dish */}
      <path d="M3.5 14h17" />
      <path d="M5 14c.5 2.6 3.4 4 7 4s6.5-1.4 7-4" />
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

/* ── "Planning For" ribbon icons ───────────────────────────── */

/* Four-point sparkle — "Any Occasion". */
export function Sparkle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3c.6 3.8 1.7 4.9 5.5 5.5C13.7 9.1 12.6 10.2 12 14c-.6-3.8-1.7-4.9-5.5-5.5C10.3 7.9 11.4 6.8 12 3Z" />
      <path d="M18 14.5c.3 1.7.8 2.2 2.5 2.5-1.7.3-2.2.8-2.5 2.5-.3-1.7-.8-2.2-2.5-2.5 1.7-.3 2.2-.8 2.5-2.5Z" />
    </svg>
  );
}

/* Interlocking rings — "Wedding". */
export function Rings(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="14" r="5" />
      <circle cx="15" cy="14" r="5" />
      <path d="M9 4.5 7.5 7h3L9 4.5ZM15 4.5 13.5 7h3L15 4.5Z" />
    </svg>
  );
}

/* Briefcase — "Corporate". */
export function Briefcase(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
    </svg>
  );
}

/* Gift box — "Birthday". */
export function Gift(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="9" width="16" height="11" rx="1.5" />
      <path d="M2.5 9h19v3.5h-19zM12 9v11" />
      <path d="M12 9C10.5 5.5 6 5.5 7.5 8.5 8.3 9 10 9 12 9Zm0 0c1.5-3.5 6-3.5 4.5-.5C15.7 9 14 9 12 9Z" />
    </svg>
  );
}

/* Festival lantern — "Festival". */
export function Lantern(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4h6M10 4v2M14 4v2" />
      <path d="M7 9.5C7 7.6 9.2 6 12 6s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5Z" />
      <path d="M7.5 13c.6 1.7 2.4 3 4.5 3s3.9-1.3 4.5-3" />
      <path d="M12 16v3M11 19h2" />
    </svg>
  );
}

/* House — "House Party". */
export function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.8V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.8" />
      <path d="M10 20v-5h4v5" />
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
