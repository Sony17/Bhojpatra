import { navLinks } from "@/lib/data";

export default function Footer() {
  return (
    <footer className="bg-maroon-dark text-cream/80">
      <div className="mx-auto max-w-7xl px-5 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-bold text-cream">
              bhoj<span className="text-cream">·</span>patra
            </p>
            <p className="mt-2 max-w-xs text-sm text-cream/60">
              India&apos;s feast booking platform. Different specialists, one
              celebration.
            </p>
            <p className="mt-3 text-sm text-cream/70">@bhojpatraofficial</p>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">Explore</p>
            <ul className="space-y-2 text-sm">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-cream">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">Company</p>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-cream">About Us</a></li>
              <li><a href="#careers" className="hover:text-cream">Careers</a></li>
              <li><a href="#contact" className="hover:text-cream">Contact</a></li>
              <li><a href="#terms" className="hover:text-cream">Terms &amp; Privacy</a></li>
            </ul>
          </div>

          <div>
            <p className="eyebrow mb-3 text-xs font-semibold text-cream">Get in touch</p>
            <p className="text-sm text-cream/70">info@bhojpatra.com</p>
            <p className="mt-1 text-sm text-cream/70">+91 12345 67890</p>
            <p className="mt-1 text-sm text-cream/70">www.bhojpatra.com</p>
          </div>
        </div>

        <div className="mt-10 border-t border-cream/10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Bhojpatra. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
