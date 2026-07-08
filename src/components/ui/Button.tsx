import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";
import Spinner from "./Spinner";

/**
 * The one Button for the whole app. Replaces the 8+ hand-rolled button styles
 * the audit found. Every button in Bhojpatra should be this component so radius,
 * height, focus ring, hover/press motion and disabled state are identical
 * everywhere.
 *
 * - `variant` — primary (solid red CTA), secondary (red outline → fills on
 *   hover), ghost (text + cream wash), destructive (brand-black), inverse
 *   (cream fill / red text — for CTAs sitting ON a red surface).
 * - `size`    — sm (dense/tables), md (default), lg (hero/checkout CTAs).
 * - Pass `href` to render a link (internal → next/link, external/hash → <a>).
 *
 * Brand-safe: hover never darkens the red (there is no darker brand red); it
 * lifts + deepens the shadow + sweeps the `.btn-sheen` highlight instead.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "focus-ring group relative inline-flex items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "btn-sheen bg-maroon text-cream shadow-brand hover:-translate-y-0.5 hover:shadow-pop",
  secondary:
    "border border-maroon bg-transparent text-maroon hover:bg-maroon hover:text-cream",
  ghost: "bg-transparent text-maroon hover:bg-cream-2",
  destructive:
    "bg-ink text-cream shadow-card hover:-translate-y-0.5 hover:shadow-pop",
  inverse:
    "btn-sheen bg-cream text-maroon shadow-card hover:-translate-y-0.5 hover:bg-white hover:shadow-pop",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 gap-1.5 px-4 py-2 text-xs",
  md: "tap px-5 py-2.5 text-sm",
  lg: "tap min-h-12 px-7 py-3 text-base",
};

type BaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  children?: ReactNode;
  href?: string;
  /** Anchor attributes — only meaningful together with `href`. */
  target?: string;
  rel?: string;
  download?: boolean | string;
};

type ButtonProps = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  children,
  href,
  target,
  rel,
  download,
  disabled,
  type,
  ...rest
}: ButtonProps) {
  const cls = cn(
    BASE,
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {loading && <Spinner className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {!loading && leftIcon}
      {children != null && <span>{children}</span>}
      {!loading && rightIcon}
    </>
  );

  if (href && !disabled) {
    const anchorProps = rest as unknown as AnchorHTMLAttributes<HTMLAnchorElement>;
    // Default external _blank links to a safe rel unless one was given.
    const relResolved =
      rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);
    // Anything with a URI scheme (https:, mailto:, tel:, upi:, whatsapp:, …) or
    // a hash is a plain <a> — only same-origin route paths use next/link.
    const external = /^([a-z][a-z0-9+.-]*:|#)/i.test(href);
    if (external) {
      return (
        <a
          href={href}
          target={target}
          rel={relResolved}
          download={download}
          className={cls}
          {...anchorProps}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} target={target} rel={relResolved} className={cls} {...anchorProps}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cls}
      {...rest}
    >
      {content}
    </button>
  );
}
