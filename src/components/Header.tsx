import Image from "next/image";
import { navLinks } from "@/lib/data";

function Logo() {
  return (
    <a href="#home" className="flex flex-col gap-0 leading-none">
      <Image
        src="/bhojpatra-logo.png"
        alt="Bhojpatra"
        width={894}
        height={226}
        priority
        className="h-14 w-auto drop-shadow-[0_2px_8px_rgba(255,255,255,0.65)] sm:h-16"
      />
      <span className="block w-full text-[11px] font-bold uppercase text-ink-soft text-justify [text-align-last:justify] [text-shadow:0_1px_3px_rgba(255,255,255,0.7)]">
        India&apos;s Feast Booking Platform
      </span>
    </a>
  );
}

export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-50">
      {/* Soft scrim so the logo + nav lift off the bright hero artwork */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-32 bg-gradient-to-b from-cream-2/90 via-cream-2/50 to-transparent"
      />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm font-semibold text-ink lg:flex [&_a]:[text-shadow:0_1px_3px_rgba(255,255,255,0.6)]">
          {navLinks.map((link) => (
            <div key={link.label} className="group relative">
              <a
                href={link.href}
                className="flex items-center gap-1 transition-colors group-hover:text-maroon"
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
                <div className="invisible absolute left-1/2 top-full z-50 w-80 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                  <ul className="overflow-hidden rounded-2xl border border-maroon/10 bg-cream-2 shadow-xl shadow-maroon/10 [&_a]:[text-shadow:none]">
                    {link.items.map((item) => (
                      <li key={item.title} className="border-b border-maroon/10 last:border-b-0">
                        <a
                          href={item.href}
                          className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-maroon/5"
                        >
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-maroon/15">
                            <Image
                              src={item.image}
                              alt={item.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </span>
                          <span className="flex flex-col leading-tight">
                            <span className="text-base font-bold text-maroon">{item.title}</span>
                            <span className="text-sm font-normal text-ink-soft">{item.subtitle}</span>
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

        <div className="flex items-center gap-2.5">
          <a
            href="#login"
            className="rounded-md border border-maroon/40 px-5 py-2 text-sm font-medium text-maroon transition-colors hover:bg-maroon/5"
          >
            Log In
          </a>
          <a
            href="#signup"
            className="rounded-md bg-maroon px-5 py-2 text-sm font-medium text-cream shadow-sm transition-colors hover:bg-maroon-dark"
          >
            Sign Up
          </a>
        </div>
      </div>
    </header>
  );
}
