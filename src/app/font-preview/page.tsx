/* Client-facing font showcase — visit /font-preview to compare options.
   Fonts are defined locally here so the live site layout is untouched.
   Once a choice is made, we wire it in and delete this route. */

import {
  // ── Cursive / script ──
  Dancing_Script,
  Great_Vibes,
  Pacifico,
  Sacramento,
  Allura,
  Parisienne,
  Satisfy,
  Kaushan_Script,
  Yellowtail,
  Cookie,
  // ── Display / heading ──
  Playfair_Display,
  Cormorant_Garamond,
  Marcellus,
  Fraunces,
  DM_Serif_Display,
  Spectral,
  Poppins,
  Tiro_Devanagari_Hindi,
} from "next/font/google";

/* ── Cursive / script candidates ──────────────────────────────────────── */
const dancingScript = Dancing_Script({ subsets: ["latin"] });
const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"] });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"] });
const sacramento = Sacramento({ weight: "400", subsets: ["latin"] });
const allura = Allura({ weight: "400", subsets: ["latin"] });
const parisienne = Parisienne({ weight: "400", subsets: ["latin"] });
const satisfy = Satisfy({ weight: "400", subsets: ["latin"] });
const kaushan = Kaushan_Script({ weight: "400", subsets: ["latin"] });
const yellowtail = Yellowtail({ weight: "400", subsets: ["latin"] });
const cookie = Cookie({ weight: "400", subsets: ["latin"] });

/* ── Display / heading candidates ─────────────────────────────────────── */
const playfair = Playfair_Display({ subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const marcellus = Marcellus({ weight: "400", subsets: ["latin"] });
const fraunces = Fraunces({ subsets: ["latin"] });
const dmSerif = DM_Serif_Display({ weight: "400", subsets: ["latin"] });
const spectral = Spectral({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const tiroDevanagari = Tiro_Devanagari_Hindi({
  weight: "400",
  subsets: ["latin"],
});

type Sample = {
  name: string;
  className: string;
  note: string;
};

const cursive: Sample[] = [
  { name: "Dancing Script", className: dancingScript.className, note: "Lively, flowing handwriting. Warm & celebratory." },
  { name: "Great Vibes", className: greatVibes.className, note: "Elegant formal calligraphy. Wedding-invitation feel." },
  { name: "Pacifico", className: pacifico.className, note: "Bold, rounded retro script. Friendly & casual." },
  { name: "Sacramento", className: sacramento.className, note: "Thin monoline script. Delicate & minimal." },
  { name: "Allura", className: allura.className, note: "Airy, refined calligraphy with long flourishes." },
  { name: "Parisienne", className: parisienne.className, note: "Charming, slightly casual handwritten script." },
  { name: "Satisfy", className: satisfy.className, note: "Relaxed brush-pen handwriting. Approachable." },
  { name: "Kaushan Script", className: kaushan.className, note: "Energetic slanted brush script. Bold accent." },
  { name: "Yellowtail", className: yellowtail.className, note: "Retro connected script with a vintage diner vibe." },
  { name: "Cookie", className: cookie.className, note: "Sweet, compact handwriting. Playful & soft." },
];

const display: Sample[] = [
  { name: "Playfair Display", className: playfair.className, note: "High-contrast serif. Premium, editorial elegance." },
  { name: "Cormorant Garamond", className: cormorant.className, note: "Refined Garamond serif. Luxurious & airy." },
  { name: "Marcellus", className: marcellus.className, note: "Classy roman-inspired display serif. Timeless." },
  { name: "Fraunces", className: fraunces.className, note: "Warm 'old-style' serif with personality." },
  { name: "DM Serif Display", className: dmSerif.className, note: "Bold ornamental serif. Strong headlines." },
  { name: "Spectral", className: spectral.className, note: "Graceful screen-first serif. Reads beautifully." },
  { name: "Poppins", className: poppins.className, note: "Clean geometric sans. Modern & versatile." },
  { name: "Tiro Devanagari Hindi", className: tiroDevanagari.className, note: "Indian-rooted serif. On-brand for a desi feast." },
];

function FontCard({ sample }: { sample: Sample }) {
  return (
    <section className="rounded-3xl border border-cream-3 bg-cream-2 p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-ink-soft">
          {sample.name}
        </h3>
        <span className="text-xs text-ink-soft">{sample.note}</span>
      </div>

      <div className={`${sample.className} mt-5 space-y-2 text-maroon`}>
        <p className="text-5xl leading-tight sm:text-6xl">Bhojpatra</p>
        <p className="text-3xl text-ink sm:text-4xl">One Celebration.</p>
        <p className="text-xl text-ink-soft sm:text-2xl">
          India&apos;s Feast Booking Platform
        </p>
      </div>
    </section>
  );
}

export default function FontPreview() {
  return (
    <main className="min-h-screen bg-surface px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <p className="eyebrow text-xs font-semibold text-gold">Bhojpatra · Typography</p>
          <h1 className="mt-3 text-4xl font-bold text-maroon sm:text-5xl">
            Font Options
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-ink-soft">
            Each card shows real Bhojpatra text. Pick a cursive accent for
            headline flourishes, and a display font for headings — tell us your
            favourites and we&apos;ll apply them across the site.
          </p>
        </header>

        {/* Cursive / script */}
        <div className="mt-14">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-ink">Cursive &amp; Script</h2>
            <span className="h-px flex-1 bg-cream-3" />
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Best for short accents — a hero word, the tagline, section flourishes.
          </p>
          <div className="mt-8 space-y-8">
            {cursive.map((s) => (
              <FontCard key={s.name} sample={s} />
            ))}
          </div>
        </div>

        {/* Display / heading */}
        <div className="mt-16">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-ink">Display &amp; Heading</h2>
            <span className="h-px flex-1 bg-cream-3" />
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            Best for section titles and body emphasis — readable at every size.
          </p>
          <div className="mt-8 space-y-8">
            {display.map((s) => (
              <FontCard key={s.name} sample={s} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
