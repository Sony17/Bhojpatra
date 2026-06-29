/**
 * Admin-panel icons.
 *
 * Drawn in the exact same idiom as the site's `src/components/icons.tsx`
 * (1.6 stroke, round caps/joins, 24×24 viewBox) so the admin chrome reads as
 * the same product. Icons that already exist in the site set are re-exported
 * here so consumers have a single import surface and we avoid duplicating glyphs.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

/* ── Reused from the site icon set (single import surface) ───────────────── */
export {
  ShieldCheck,
  Users,
  Calendar,
  ArrowRight,
  ChevronDown,
  Star,
  StarSolid,
} from "@/components/icons";

/* ── Dashboard / grid ───────────────────────────────────────────────────── */
export function Grid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

/* Storefront — Vendors. */
export function Store(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5 5.5 5h13L20 9.5" />
      <path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5.5 11v8a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8" />
      <path d="M9.5 20v-5h5v5" />
    </svg>
  );
}

/* Fork & knife — Menu & Catalog. */
export function Utensils(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3v5a2 2 0 0 0 4 0V3" />
      <path d="M9 8v13" />
      <path d="M16.5 3c-1.4 1-2.3 3-2.3 5.5 0 1.7.9 2.7 2.3 2.8V3Z" />
      <path d="M16.5 11.3V21" />
    </svg>
  );
}

/* Plus-in-circle — Add-On Manager. */
export function PlusCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

/* Wallet — Payments / Revenue. */
export function Wallet(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H17a1 1 0 0 1 1 1v1" />
      <rect x="4" y="7.5" width="16" height="12" rx="2" />
      <path d="M16 13.5h2.5" />
    </svg>
  );
}

/* Ticket — Coupons. */
export function Ticket(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
      <path d="M14 6v1M14 11v2M14 17v1" />
    </svg>
  );
}

/* Layout panes — Content Control. */
export function Layout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M9 9.5V19.5" />
    </svg>
  );
}

/* Bar chart — Reports. */
export function BarChart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20h16" />
      <path d="M6.5 20v-6M12 20V5M17.5 20v-9" />
    </svg>
  );
}

/* Gear — Settings. */
export function Gear(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L14 1.7h-4l-.7 2.4a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L3.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.7 2.4h4l.7-2.4a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5Z" />
    </svg>
  );
}

/* Magnifier — global search. */
export function Search(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

/* Megaphone — promotions / lead generation. */
export function Megaphone(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 11v2a1 1 0 0 0 1 1h2l9 4V6L6 10H4a1 1 0 0 0-1 1Z" />
      <path d="M15 6a4.5 4.5 0 0 1 0 12" />
      <path d="M7 14v3a2 2 0 0 0 4 0v-1" />
    </svg>
  );
}

/* Bell — notifications. */
export function Bell(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

/* Door / arrow — back to site. */
export function LogOut(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

/* Hamburger — open mobile sidebar. */
export function Menu(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

/* X — close mobile sidebar. */
export function Close(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/* Share / network — Referrals. */
export function Share(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="17.5" cy="6" r="2.5" />
      <circle cx="17.5" cy="18" r="2.5" />
      <path d="m8.3 10.8 7-3.6M8.3 13.2l7 3.6" />
    </svg>
  );
}

/* Trophy — leaderboard / top referrers. */
export function Trophy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5a2.5 2.5 0 0 1-2.5 4" />
      <path d="M12 14v3M9 20h6M10 20v-1.5a2 2 0 0 1 4 0V20" />
    </svg>
  );
}

/* Copy — copy a referral code. */
export function Copy(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15a2 2 0 0 1-1-1.7V6a2 2 0 0 1 2-2h7.3A2 2 0 0 1 15 5" />
    </svg>
  );
}
