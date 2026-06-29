@AGENTS.md

# Brand Colors

The Bhojpatra brand uses **exactly four colors**. These are the ONLY colors
allowed anywhere in the UI — do not introduce any other hue.

| Color | Hex       | RGB           | Use                                   |
| ----- | --------- | ------------- | ------------------------------------- |
| Red   | `#B92025` | 185 32 37     | Primary brand / accents / CTAs        |
| Cream | `#F0D09E` | 240 208 158   | Light-on-red, surfaces, accents       |
| Black | `#000000` | 0 0 0         | Body & heading text, ink              |
| White | `#FFFFFF` | 255 255 255   | Surfaces, text-on-red                 |

Rules:
- Use **only** these four exact hex codes. Nothing else — no tints, no shades,
  no in-between hues. No darker/lighter reds, no beiges, no greys, no greens,
  no blues, no browns. Do not use any `gray-*`, `green-*`, `slate-*`, etc.
  Tailwind palette, and do not hand-pick a "slightly deeper" version of a
  brand color.
- The ONLY permitted variation is **alpha (opacity) applied to one of these
  four exact colors** — and only for shadows/overlays where transparency is
  structurally required. The RGB must still be one of the four brand colors
  (`185,32,37` / `240,208,158` / `0,0,0` / `255,255,255`). Never introduce a
  new RGB.
- For semantic states (status, veg/non-veg, success), express meaning with the
  brand colors (red vs black vs cream) — do not reach for green/red/amber.
- All color tokens live in `src/app/globals.css` (`@theme`) and every one
  resolves to a single brand hex. Use those tokens; never hard-code a color
  that isn't one of the four.

# Brand Typography

The Bhojpatra brand uses two fonts. Use these consistently across the UI.

- **Ananda Neptouch 2** (Regular) — the **branding font**. Used for the logo/wordmark
  ("bhojpatra") and for display/brand headings. Decorative; use sparingly.
- **Open Sans** (Regular, full family) — the **primary UI/body font**. Use for all
  body copy, paragraphs, UI labels, buttons, and form text.

Guidelines:
- Default everything to Open Sans. Reserve Ananda Neptouch 2 for brand moments (logo,
  hero/section display headings).
- Both fonts use the Regular weight as the base.
- Support full character set: A–Z, a–z, 0–9, and `!? (),.`
