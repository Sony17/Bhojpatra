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
 *   hover), ghost (text + cream wash), destructive (brand-black).
 * - `size`    — sm (dense/tables), md (default), lg (hero/checkout CTAs).
 * - Pass `href` to render a link (internal → next/link, external/hash → <a>).
 *
 * Brand-safe: hover never darkens the red (there is no darker brand red); it
 * lifts + deepens the shadow + sweeps the `.btn-sheen` highlight instead.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
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
    const external = /^(https?:|mailto:|tel:|#)/.test(href);
    if (external) {
      return (
        <a href={href} className={cls} {...anchorProps}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...anchorProps}>
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
