"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { navLinks } from "@/lib/data";

/** Role icons for the "Partner With Us" dropdown — drawn to match each option. */
const partnerIcons: Record<string, React.ReactNode> = {
  // Vendor — chef's hat (works / cooking)
  vendor: (
    <path d="M7 14v4.5h10V14m-9 0a3.5 3.5 0 0 1-1-6.86A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 5 3.14A3.5 3.5 0 0 1 16 14H8Z" />
  ),
  // Event Planner — calendar with a check
  planner: (
    <>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-12Z" />
      <path d="M8 3v4M16 3v4M4 9.5h16M9 14.5l2 2 4-4" />
    </>
  ),
  // Individual — single person
  individual: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  // Venue Owner — building
  venue: (
    <>
      <path d="M5 20V6.5L12 4l7 2.5V20" />
      <path d="M3.5 20h17M9 20v-4h6v4M9 9h1.5M13.5 9H15M9 12.5h1.5M13.5 12.5H15" />
    </>
  ),
};

function Logo() {
  return (
    <Link href="/" className="flex flex-col gap-0 leading-none">
      <Image
        src="/bhojpatra-logo.png"
        alt="Bhojpatra"
        width={894}
        height={226}
        priority
        className="h-12 w-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)] sm:h-16"
      />
      <span className="font-script block w-full text-center text-lg leading-none text-black [text-shadow:0_1px_3px_rgba(255,255,255,0.7)] sm:text-xl">
        India&apos;s Feast Booking Platform
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      {/* Soft scrim so the logo + nav lift off the bright hero artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-cream-2/90 via-cream-2/50 to-transparent"
      />
      <div className="animate-fade mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-semibold text-ink lg:flex [&_a]:[text-shadow:0_1px_3px_rgba(255,255,255,0.6)]">
          {navLinks.map((link) => (
            <div key={link.label} className="group relative">
              <a
                href={link.href.startsWith("#") ? `/${link.href}` : link.href}
                className="link-underline flex items-center gap-1 transition-colors group-hover:text-maroon"
              >
                {link.label}
                {link.hasDropdown && (
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    className="h-3 w-3 transition-transform group-hover:-rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </a>

              {link.items && (
                <div className="invisible absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 translate-y-2 pt-3 opacity-0 transition-all duration-300 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  <ul className="overflow-hidden rounded-2xl border border-maroon-dark/40 bg-maroon shadow-xl shadow-maroon/30 [&_a]:[text-shadow:none]">
                    {link.items.map((item) => (
                      <li key={item.title} className="border-b border-cream/15 last:border-b-0">
                        <a
                          href={item.href}
                          className="group/item flex items-center gap-4 px-5 py-4 transition-colors hover:bg-maroon-dark"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cream/15 ring-1 ring-cream/25 transition-transform duration-300 group-hover/item:scale-110">
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              className="h-6 w-6 text-cream"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {partnerIcons[item.iconKey]}
                            </svg>
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span className="text-base font-bold text-cream">{item.title}</span>
                            <span className="text-sm font-normal text-cream/70">{item.subtitle}</span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href="/login"
            className="rounded-md border border-maroon/40 px-5 py-2 text-sm font-medium text-maroon transition-all duration-200 hover:bg-maroon/5 active:scale-95"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="btn-sheen rounded-md bg-maroon px-5 py-2 text-sm font-medium text-cream shadow-sm transition-all duration-200 hover:bg-maroon-dark hover:shadow-md active:scale-95"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile hamburger toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex h-10 w-10 items-center justify-center rounded-md border border-maroon/30 bg-white/70 text-maroon backdrop-blur-sm transition-colors hover:bg-white lg:hidden"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {open ? (
              <path d="M6 6 18 18 M18 6 6 18" />
            ) : (
              <path d="M3 6h18 M3 12h18 M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div id="mobile-menu" className="lg:hidden">
          <nav className="animate-rise mx-4 mb-4 overflow-hidden rounded-2xl border border-maroon/10 bg-cream-2 shadow-xl shadow-maroon/10 [animation-duration:0.45s]">
            <ul className="divide-y divide-maroon/10 text-sm font-semibold text-ink">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href.startsWith("#") ? `/${link.href}` : link.href}
                    onClick={() => setOpen(false)}
                    className="block px-5 py-3.5 transition-colors hover:bg-maroon/5 hover:text-maroon"
                  >
                    {link.label}
                  </a>
                  {link.items && (
                    <ul className="bg-white/40">
                      {link.items.map((item) => (
                        <li key={item.title}>
                          <a
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="block px-8 py-2.5 text-sm font-normal text-ink-soft transition-colors hover:bg-maroon/5 hover:text-maroon"
                          >
                            {item.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2.5 border-t border-maroon/10 p-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-md border border-maroon/40 px-5 py-2.5 text-center text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="rounded-md bg-maroon px-5 py-2.5 text-center text-sm font-medium text-cream shadow-sm transition-colors hover:bg-maroon-dark"
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
