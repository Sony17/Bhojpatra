"use client";

import { useEffect, useState } from "react";

/**
 * Brand splash / loader shown on the initial page load. The Bhojpatra scroll
 * logo pops in and gently floats over a clean white field while three brand-red
 * dots pulse, then the whole overlay fades away to reveal the site.
 *
 * It is part of the server-rendered tree so it covers the page from the very
 * first paint (no flash of unstyled content). After a short beat it fades out
 * and removes itself from the DOM. Motion is skipped for `prefers-reduced-motion`.
 */
export default function SiteLoader() {
  const [done, setDone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setDone(true), 1800);
    const drop = setTimeout(() => setRemoved(true), 2450);
    return () => {
      clearTimeout(fade);
      clearTimeout(drop);
    };
  }, []);

  if (removed) return null;

  return (
    <div className={`site-loader${done ? " is-done" : ""}`} aria-hidden>
      <div className="site-loader__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/watermark-pot.png"
          alt="bhojpatra"
          width={421}
          height={534}
          className="site-loader__logo"
        />
        <div className="site-loader__dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
