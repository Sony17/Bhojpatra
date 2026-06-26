"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Display string with a leading number, e.g. "10,000+", "1 Lakh+", "4.8/5". */
  value: string;
  /** Animation duration in ms. */
  duration?: number;
  className?: string;
}

/** Split "10,000+" → { prefix:"", num:10000, suffix:"+", decimals:0, grouped:true }. */
function parse(value: string) {
  const match = value.match(/^(\D*)([\d.,]+)(.*)$/s);
  if (!match) return null;
  const [, prefix, rawNum, suffix] = match;
  const grouped = rawNum.includes(",");
  const plain = rawNum.replace(/,/g, "");
  const decimals = plain.includes(".") ? plain.split(".")[1].length : 0;
  const num = parseFloat(plain);
  if (Number.isNaN(num)) return null;
  return { prefix, num, suffix, decimals, grouped };
}

/**
 * Counts a stat up from zero when it scrolls into view. Falls back to the raw
 * value instantly for unparseable strings or reduced-motion users, so the real
 * figure is always what's shown at rest.
 */
export default function CountUp({
  value,
  duration = 1600,
  className,
}: CountUpProps) {
  const parsed = parse(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<string>(parsed ? "" : value);

  useEffect(() => {
    const node = ref.current;
    if (!node || !parsed) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const format = (n: number) => {
      const fixed = n.toFixed(parsed.decimals);
      const out = parsed.grouped
        ? Number(fixed).toLocaleString("en-IN", {
            minimumFractionDigits: parsed.decimals,
            maximumFractionDigits: parsed.decimals,
          })
        : fixed;
      return `${parsed.prefix}${out}${parsed.suffix}`;
    };

    if (reduced) {
      setDisplay(format(parsed.num));
      return;
    }

    let raf = 0;
    let start = 0;
    const run = (now: number) => {
      if (!start) start = now;
      const t = Math.min((now - start) / duration, 1);
      // ease-out-cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(format(parsed.num * eased));
      if (t < 1) raf = requestAnimationFrame(run);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          raf = requestAnimationFrame(run);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display || (parsed ? `${parsed.prefix}0${parsed.suffix}` : value)}
    </span>
  );
}
