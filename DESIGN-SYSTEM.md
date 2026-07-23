# Bhojpatra — Design System Hand-off

Everything a developer needs to build on-brand. All values are the real tokens
from `src/app/globals.css`. **Use the tokens/utility classes — never hard-code a
raw value that isn't listed here.**

---

## 1. Colours — exactly 4, nothing else

| Role  | Hex       | RGB             | Tailwind token        |
| ----- | --------- | --------------- | --------------------- |
| Red   | `#B92025` | `185 32 37`     | `brand-red` / `primary` |
| Cream | `#F0D09E` | `240 208 158`   | `brand-cream` / `secondary` / `border` |
| Black | `#000000` | `0 0 0`         | `brand-black` / `ink` |
| White | `#FFFFFF` | `255 255 255`   | `brand-white` / `surface` / `bg` |

**Rules**
- No other hue anywhere — no greys, beiges, greens, blues, browns, no tints/shades.
- The **only** allowed variation is **opacity applied to one of these 4** — and
  only for shadows/overlays. The RGB must still be one of the four above.
- Semantic states use brand colours, not green/amber:
  `success = cream`, `warning = cream`, `error = red`.

---

## 2. Typography — exactly 2 fonts

| Font | Weight | Where |
| ---- | ------ | ----- |
| **Ananda Neptouch 2** | Regular (400) | Logo/wordmark, hero & section display headings, `h1–h6`, `.font-display`. Decorative — never for running text. |
| **Open Sans** | Regular family | Everything else: body, UI labels, buttons, forms, subtitles, captions. |

### Type scale (px shown at min → max of the responsive clamp)

| Class | Font | Size | Line-height | Tracking | Weight |
| ----- | ---- | ---- | ----------- | -------- | ------ |
| `.text-hero`      | Display   | 40 → 60px | 1.02 | −0.02em | 400 |
| `.text-title`     | Display   | 28 → 40px | 1.12 | −0.01em | 400 |
| `.text-app-title` | Open Sans | 22 → 28px | 1.25 | −0.02em | 700 |
| `.text-subtitle`  | Open Sans | 17 → 19px | 1.55 | —       | 400 |
| `.text-body`      | Open Sans | 15px      | 1.6  | —       | 400 |
| `.text-caption`   | Open Sans | 12px      | 1.45 | —       | 400 |
| `.eyebrow`        | Open Sans | (inherit) | —    | 0.18em, UPPERCASE | — |

---

## 3. Spacing — 8-point scale

| Token | rem | px |
| ----- | --- | -- |
| `bp-1` | 0.5  | **8** |
| `bp-2` | 1    | **16** |
| `bp-3` | 1.5  | **24** |
| `bp-4` | 2    | **32** |
| `bp-5` | 2.5  | **40** |
| `bp-6` | 3    | **48** |
| `bp-7` | 3.5  | **56** |
| `bp-8` | 4    | **64** |

Use multiples of 8 for layout. Utilities: `p-bp-3`, `gap-bp-2`, etc.

---

## 4. Corner radius

| Token | px | Use |
| ----- | -- | --- |
| `rounded-control` | 12 | Buttons, inputs |
| `rounded-card`    | 16 | Cards, panels |
| `rounded-sheet`   | 20 | Bottom sheets |
| `rounded-hero`    | 24 | Media / hero tiles |

---

## 5. Elevation (shadows) — black/red alpha only

| Token | Value |
| ----- | ----- |
| `shadow-card`   | `0 1px 2px rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.10)` |
| `shadow-pop`    | `0 2px 8px rgba(0,0,0,.05), 0 16px 40px -16px rgba(0,0,0,.18)` |
| `shadow-modal`  | `0 24px 60px -20px rgba(0,0,0,.35)` |
| `shadow-brand`  | `0 10px 28px -12px rgba(185,32,37,.40)` |
| `shadow-pop-up` | `0 -8px 28px -14px rgba(0,0,0,.16)` (upward sticky bars) |
| `shadow-soft`   | `0 2px 12px -4px rgba(0,0,0,.08)` |

---

## 6. Motion

| Token | Value | Use |
| ----- | ----- | --- |
| `--dur-fast` | 150ms | quick state changes |
| `--dur`      | 200ms | default UI transitions |
| `--dur-slow` | 250ms | larger moves |
| `--ease-out-soft` | `cubic-bezier(.22,.61,.36,1)` | UI interactions |
| `--ease-out-expo` | `cubic-bezier(.16,1,.3,1)` | entrances / reveals |

- All motion is gated behind `prefers-reduced-motion` — respect it.
- Interaction transitions ≤ 250ms, no bounce.

---

## 7. Layout chrome & interaction

| Spec | Value |
| ---- | ----- |
| App header height | 84px mobile (`5.25rem` + safe-top), 92px desktop |
| Bottom tab bar height | 72px (`4.5rem`) |
| **Minimum touch target** | **44px** (`.tap`) — every interactive control |
| Focus ring | `0 0 0 2px #FFFFFF, 0 0 0 4px rgba(185,32,37,.45)` (white offset + red halo) — via `.focus-ring` |
| Scrollbar | 8px, red (`#B92025`) thumb on cream (`#F0D09E`) track |
| Text selection | red background, cream text |

### Breakpoints
- **sm** = 640px
- **lg** = 1024px (desktop layout switch; mobile-first below this)

Safe-area insets are respected via `env(safe-area-inset-*)` for PWA/notch.

---

## 8. Mobile vs Desktop

Mobile-first — the phone spec is the base; the desktop column kicks in at the
**`lg` breakpoint (≥ 1024px)**. Type sizes are fluid clamps that scale between
the two ends automatically.

| Element | Mobile (< 1024px) | Desktop (≥ 1024px) |
| ------- | ----------------- | ------------------ |
| Hero heading (`.text-hero`)      | 40px | 60px |
| Section title (`.text-title`)    | 28px | 40px |
| Screen title (`.text-app-title`) | 22px | 28px |
| Subtitle (`.text-subtitle`)      | 17px | 19px |
| Body / caption                   | 15 / 12px | 15 / 12px (same) |
| App header height                | 84px (`5.25rem` + safe-top) | 92px (`5.75rem` + safe-top) |
| Page top padding (`.app-page-pad`) | 88px (`5.5rem`) | 104px (`6.5rem`) |
| Bottom tab bar                   | 72px, visible | hidden |
| Sticky bottom CTA (`.app-sticky-cta`) | fixed above tab bar | hidden |
| Bottom safe padding (`.app-bottom-safe`) | 104px (`6.5rem`) | 56px (`3.5rem`) |
| Hero image drift animation       | frozen (no zoom) | slow 28s ambient zoom |
| In-page anchor scroll            | native (snappy) | CSS smooth-scroll |

- Design the phone layout first at **360–430px**; the same components reflow at `lg`.
- Respect safe-area insets (`env(safe-area-inset-*)`) top & bottom for notch /
  home-bar / installed PWA.
- **44px minimum touch target holds on both mobile and desktop.**

---

## 9. Dark mode
Same four hexes, roles inverted (surfaces → black, ink → white, cream stays as
accent/border). Opt-in via `.dark` / `[data-theme="dark"]` or system preference
when `data-theme="system"`. No new colours are introduced in dark mode.

---

### TL;DR for the developer
4 colours · 2 fonts · 8px spacing grid · 12/16/20/24px radii · 44px min touch
target · motion ≤250ms respecting reduced-motion · breakpoints 640 / 1024.
Build from the tokens in `globals.css` — don't invent values.
