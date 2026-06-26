"use client";

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

type Variant = "up" | "down" | "left" | "right" | "scale" | "fade";

interface RevealProps {
  children: ReactNode;
  /** Direction/style the content eases in from. Default "up". */
  variant?: Variant;
  /** Extra delay before this element animates, in ms. */
  delay?: number;
  /**
   * Stagger direct children in sequence instead of moving as one block.
   * Use on grids/lists so each card cascades in.
   */
  stagger?: boolean;
  /** Element to render. Default "div". */
  as?: ElementType;
  className?: string;
}

/**
 * Scroll-reveal wrapper. Content sits in its pre-animation state (defined in
 * globals.css) until it scrolls into view, then eases into place exactly once.
 * Motion is fully disabled for users with `prefers-reduced-motion: reduce`
 * (the CSS simply never hides the content), so this stays accessible.
 */
export default function Reveal({
  children,
  variant = "up",
  delay = 0,
  stagger = false,
  as,
  className = "",
}: RevealProps) {
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Honour reduced-motion: reveal immediately, skip the observer.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const base = stagger ? "reveal-stagger" : "reveal";
  const classes = [base, visible ? "is-visible" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      ref={ref}
      data-variant={stagger ? undefined : variant}
      className={classes}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
