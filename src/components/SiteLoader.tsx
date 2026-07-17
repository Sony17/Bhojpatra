"use client";

import { useEffect, useState } from "react";

const FADE_MS = 1000;
const REMOVE_MS = 1500;

/**
 * Brand splash on first paint. React timers remove it after hydration; CSS
 * `site-loader-auto-hide` still fades it out if the client bundle never runs.
 */
export default function SiteLoader() {
  const [done, setDone] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const fade = window.setTimeout(() => setDone(true), FADE_MS);
    const drop = window.setTimeout(() => setRemoved(true), REMOVE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(drop);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      id="site-loader"
      className={`site-loader${done ? " is-done" : ""}`}
      aria-hidden
      onAnimationEnd={(e) => {
        if (e.animationName === "site-loader-auto-hide") setRemoved(true);
      }}
      onTransitionEnd={(e) => {
        if (done && e.propertyName === "opacity") setRemoved(true);
      }}
    >
      <div className="site-loader__art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bhojpatra-loader.png"
          alt=""
          width={493}
          height={506}
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
