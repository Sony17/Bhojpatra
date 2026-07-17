"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { inputClass } from "@/components/admin/shared/FormControls";
import ImageField from "@/components/admin/shared/ImageField";
import {
  useHomeContent,
  saveHomeContent,
  resetHomeContent,
  DEFAULT_HOME_CONTENT,
  isBrokenHeroImage,
  type HomeContent,
  type HomeCategory,
  type HomeOccasion,
  type HomeBrand,
  type HomeRibbonBrand,
  type HomeGalleryItem,
  type HomeTestimonial,
  type HomeTrustBadge,
  type HomeTrustBadgeIcon,
} from "@/lib/homeContent";
import { useOccasions } from "@/lib/occasions";
import { useLocations } from "@/lib/locations";
import { heroEventImages, heroLocationImages } from "@/lib/data";

/**
 * Admin editor for the public home page. Every section's copy (English +
 * Hindi) and imagery is editable here; saving writes to the shared
 * `homeContent` store so the live home page updates immediately.
 *
 * Edits are held in a local `draft` and only committed on Save, so an admin can
 * revise freely and back out with Cancel.
 */
export default function HomePageTab() {
  const content = useHomeContent();
  const occasionList = useOccasions();
  const locationList = useLocations();
  const [draft, setDraft] = useState<HomeContent>(() =>
    structuredClone(content),
  );
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // `content` starts at the default snapshot and only resolves to the stored
  // value once it loads from the API. Re-sync the draft to the real stored
  // content once it arrives (and whenever it changes elsewhere), but never
  // clobber in-progress edits.
  const syncedRef = useRef(content);
  useEffect(() => {
    if (content !== syncedRef.current && !dirty) {
      syncedRef.current = content;
      setDraft(structuredClone(content));
    }
  }, [content, dirty]);

  // Mutate one top-level section of the draft.
  function patch<K extends keyof HomeContent>(
    key: K,
    value: Partial<HomeContent[K]>,
  ) {
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...value } }));
    setDirty(true);
    setSaved(false);
  }

  const save = () => {
    void saveHomeContent(draft).catch(() => {});
    setDirty(false);
    setSaved(true);
  };

  const cancel = () => {
    setDraft(structuredClone(content));
    setDirty(false);
    setSaved(false);
  };

  const reset = () => {
    if (
      !window.confirm(
        "Reset the entire home page to its default content and images? This can't be undone.",
      )
    )
      return;
    void resetHomeContent().catch(() => {});
    setDraft(structuredClone(DEFAULT_HOME_CONTENT));
    setDirty(false);
    setSaved(false);
  };

  return (
    <div className="space-y-5">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cream-3 bg-cream/70 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-ink-soft hover:underline"
          >
            View home page
          </a>
          {saved && (
            <span className="text-xs font-medium text-maroon">Saved ✓</span>
          )}
          {dirty && (
            <span className="text-xs font-medium text-ink-soft">
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={reset}>
            Reset to defaults
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={cancel}
            disabled={!dirty}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={save}
            disabled={!dirty}
          >
            Save changes
          </Button>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <SectionCard title="Hero" defaultOpen>
        <TextRow
          label="Headline — line 1"
          en={draft.hero.headlineTop}
          hi={draft.hero.headlineTopHi}
          onEn={(v) => patch("hero", { headlineTop: v })}
          onHi={(v) => patch("hero", { headlineTopHi: v })}
        />
        <TextRow
          label="Headline — line 2 (accent)"
          en={draft.hero.headlineBottom}
          hi={draft.hero.headlineBottomHi}
          onEn={(v) => patch("hero", { headlineBottom: v })}
          onHi={(v) => patch("hero", { headlineBottomHi: v })}
        />
        <AreaRow
          label="Sub-headline"
          en={draft.hero.lede}
          hi={draft.hero.ledeHi}
          onEn={(v) => patch("hero", { lede: v })}
          onHi={(v) => patch("hero", { ledeHi: v })}
        />
        <TextRow
          label={'Hero search button (e.g. "Find Your Feast")'}
          en={draft.hero.cta}
          hi={draft.hero.ctaHi}
          onEn={(v) => patch("hero", { cta: v })}
          onHi={(v) => patch("hero", { ctaHi: v })}
        />
        <ImageField
          label="Default background image"
          value={draft.hero.background}
          hint="Fallback when no occasion or location override matches."
          onChange={(v) => patch("hero", { background: v })}
        />
        <Toggle
          label="Prioritize location backgrounds"
          checked={draft.hero.backgroundPriority === "location"}
          onChange={(on) =>
            patch("hero", {
              backgroundPriority: on ? "location" : "occasion",
            })
          }
        />
        <p className="text-xs text-ink-soft">
          {draft.hero.backgroundPriority === "location"
            ? "The selected city image is shown in the hero (event image is the fallback). Use this to preview and test location backgrounds."
            : "The selected event image is shown in the hero (city image is the fallback). This is the default."}
        </p>
        <SubCard title="Background by event (occasion)">
          <p className="text-xs text-ink-soft">
            Each event type gets its own hero image when selected in the booking
            bar. Curated defaults are pre-filled — upload to replace. Ids match{" "}
            <a href="/admin/settings" className="font-semibold text-maroon hover:underline">
              Settings → Occasions
            </a>
            .
          </p>
          {occasionList.map((o) => {
            const saved = draft.hero.backgroundsByOccasion?.[o.id];
            const effective = saved ?? heroEventImages[o.id] ?? "";
            return (
              <ImageField
                key={o.id}
                label={o.name}
                value={effective}
                hint={
                  saved
                    ? `Shown when "${o.name}" is selected.`
                    : heroEventImages[o.id]
                      ? `Curated default for "${o.name}" — upload to replace.`
                      : `Optional — shown when "${o.name}" is selected.`
                }
                onChange={(v) => {
                  const next = { ...(draft.hero.backgroundsByOccasion ?? {}) };
                  if (v) next[o.id] = v;
                  else delete next[o.id];
                  patch("hero", { backgroundsByOccasion: next });
                }}
              />
            );
          })}
        </SubCard>
        <SubCard title="Background by location">
          <p className="text-xs text-ink-soft">
            City-specific hero images when no event override matches. Curated
            defaults are pre-filled for major cities. Ids match{" "}
            <a href="/admin/settings" className="font-semibold text-maroon hover:underline">
              Settings → Locations
            </a>
            .
          </p>
          {locationList.map((loc) => {
            const saved = draft.hero.backgroundsByLocation?.[loc.id];
            const defaultUrl = heroLocationImages[loc.id] ?? "";
            const effective =
              saved && !isBrokenHeroImage(saved) ? saved : defaultUrl;
            return (
              <ImageField
                key={loc.id}
                label={loc.name}
                value={effective}
                hint={
                  saved && effective === saved
                    ? `Shown when "${loc.name}" is selected.`
                    : defaultUrl
                      ? `Curated default for "${loc.name}" — upload to replace.`
                      : `Optional — shown when "${loc.name}" is selected.`
                }
                onChange={(v) => {
                  const next = { ...(draft.hero.backgroundsByLocation ?? {}) };
                  if (v) next[loc.id] = v;
                  else delete next[loc.id];
                  patch("hero", { backgroundsByLocation: next });
                }}
              />
            );
          })}
        </SubCard>
        <ItemList
          label="Trust badge"
          items={draft.hero.trustBadges}
          onChange={(trustBadges) => patch("hero", { trustBadges })}
          makeNew={(): HomeTrustBadge => ({
            id: `trust-${Date.now()}`,
            icon: "shield",
            title: "New badge",
            titleHi: "नया बैज",
            sub: "",
            subHi: "",
          })}
          renderItem={(badge, set) => (
            <>
              <Field label="Icon">
                <select
                  className={inputClass}
                  value={badge.icon}
                  onChange={(e) =>
                    set({ icon: e.target.value as HomeTrustBadgeIcon })
                  }
                >
                  <option value="shield">Shield — verified / trust</option>
                  <option value="price">Price tag — pricing</option>
                  <option value="clipboard">Clipboard — booking</option>
                  <option value="headset">Headset — support</option>
                </select>
              </Field>
              <TextRow
                label="Title"
                en={badge.title}
                hi={badge.titleHi}
                onEn={(v) => set({ title: v })}
                onHi={(v) => set({ titleHi: v })}
              />
              <TextRow
                label="Subtitle"
                en={badge.sub}
                hi={badge.subHi}
                onEn={(v) => set({ sub: v })}
                onHi={(v) => set({ subHi: v })}
              />
            </>
          )}
        />
      </SectionCard>

      {/* ── Brand Ribbon ────────────────────────────────────────────────── */}
      <SectionCard title="Brand Ribbon">
        <p className="text-xs text-ink-soft">
          Featured-brands carousel (footer). Each card shows a cover photo,
          logo badge, name, category, location, specialty, starting price,
          rating and an optional &ldquo;Featured&rdquo; ribbon. Reorder with ↑ /
          ↓ — list order is carousel order.
        </p>
        <Toggle
          label="Show the brand ribbon"
          checked={draft.brandRibbon.enabled}
          onChange={(enabled) => patch("brandRibbon", { enabled })}
        />
        <TextRow
          label="Heading"
          en={draft.brandRibbon.heading}
          hi={draft.brandRibbon.headingHi}
          onEn={(v) => patch("brandRibbon", { heading: v })}
          onHi={(v) => patch("brandRibbon", { headingHi: v })}
        />
        <ItemList
          label="Brand"
          items={draft.brandRibbon.brands}
          onChange={(brands) => patch("brandRibbon", { brands })}
          makeNew={(): HomeRibbonBrand => ({
            id: `ribbon-brand-${Date.now()}`,
            name: "New brand",
            nameHi: "नया ब्रांड",
            logo: "",
            image: "",
            location: "",
            locationHi: "",
            rating: 0,
            reviewCount: 0,
            category: "",
            categoryHi: "",
            specialty: "",
            specialtyHi: "",
            priceFrom: 0,
            since: 0,
            featured: false,
          })}
          renderItem={(b, set) => (
            <>
              <TextRow
                label="Name"
                en={b.name}
                hi={b.nameHi}
                onEn={(v) => set({ name: v })}
                onHi={(v) => set({ nameHi: v })}
              />
              <TextRow
                label="Location"
                en={b.location}
                hi={b.locationHi}
                onEn={(v) => set({ location: v })}
                onHi={(v) => set({ locationHi: v })}
              />
              <ImageField
                label="Cover photo"
                value={b.image}
                hint="Full-bleed background on the carousel card."
                onChange={(v) => set({ image: v })}
              />
              <ImageField
                label="Brand logo"
                value={b.logo}
                hint="Shown in the white badge. Leave empty to use the name's initials."
                onChange={(v) => set({ logo: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rating (0 hides)">
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    className={inputClass}
                    value={b.rating}
                    onChange={(e) =>
                      set({
                        rating: Math.min(
                          5,
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Review count">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={b.reviewCount}
                    onChange={(e) =>
                      set({
                        reviewCount: Math.max(
                          0,
                          Math.round(Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                </Field>
              </div>
              <TextRow
                label="Category (e.g. Caterer / Venue / Halwai)"
                en={b.category}
                hi={b.categoryHi}
                onEn={(v) => set({ category: v })}
                onHi={(v) => set({ categoryHi: v })}
              />
              <TextRow
                label="Specialty (e.g. Awadhi · Mughlai)"
                en={b.specialty}
                hi={b.specialtyHi}
                onEn={(v) => set({ specialty: v })}
                onHi={(v) => set({ specialtyHi: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Price from ₹ (0 hides)">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={b.priceFrom}
                    onChange={(e) =>
                      set({
                        priceFrom: Math.max(
                          0,
                          Math.round(Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Serving since (year, 0 hides)">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={inputClass}
                    value={b.since}
                    onChange={(e) =>
                      set({
                        since: Math.max(
                          0,
                          Math.round(Number(e.target.value) || 0),
                        ),
                      })
                    }
                  />
                </Field>
              </div>
              <Toggle
                label="Show a 'Featured' ribbon"
                checked={b.featured}
                onChange={(featured) => set({ featured })}
              />
            </>
          )}
        />
      </SectionCard>

      {/* ── Services / Top Categories ───────────────────────────────────── */}
      <SectionCard title="Services">
        <TextRow
          label="Heading"
          en={draft.services.heading}
          hi={draft.services.headingHi}
          onEn={(v) => patch("services", { heading: v })}
          onHi={(v) => patch("services", { headingHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.services.subtitle}
          hi={draft.services.subtitleHi}
          onEn={(v) => patch("services", { subtitle: v })}
          onHi={(v) => patch("services", { subtitleHi: v })}
        />
        <TextRow
          label="Button label"
          en={draft.services.cta}
          hi={draft.services.ctaHi}
          onEn={(v) => patch("services", { cta: v })}
          onHi={(v) => patch("services", { ctaHi: v })}
        />

        <Toggle
          label="Show prices on category cards"
          checked={draft.services.showPrices}
          onChange={(showPrices) => patch("services", { showPrices })}
        />

        <ItemList
          label="Category"
          items={draft.services.categories}
          onChange={(categories) => patch("services", { categories })}
          makeNew={(): HomeCategory => ({
            id: `cat-${Date.now()}`,
            name: "New category",
            nameHi: "नई कैटेगरी",
            image: "",
            priceFrom: "",
          })}
          renderItem={(c, set) => (
            <>
              <TextRow
                label="Name"
                en={c.name}
                hi={c.nameHi}
                onEn={(v) => set({ name: v })}
                onHi={(v) => set({ nameHi: v })}
              />
              <Field label="Starting price">
                <input
                  className={inputClass}
                  value={c.priceFrom ?? ""}
                  placeholder="e.g. ₹999 / plate"
                  onChange={(e) => set({ priceFrom: e.target.value })}
                />
              </Field>
              <ImageField
                value={c.image}
                onChange={(v) => set({ image: v })}
              />
            </>
          )}
        />

        <SubCard title="Baina Box (curated card)">
          <p className="text-xs text-ink-soft">
            Shown in the middle of the service cards; links to the Baina Box
            catalogue instead of the booking wizard.
          </p>
          <TextRow
            label="Name"
            en={draft.services.bainaBox.name}
            hi={draft.services.bainaBox.nameHi}
            onEn={(v) =>
              patch("services", {
                bainaBox: { ...draft.services.bainaBox, name: v },
              })
            }
            onHi={(v) =>
              patch("services", {
                bainaBox: { ...draft.services.bainaBox, nameHi: v },
              })
            }
          />
          <Field label="Starting price">
            <input
              className={inputClass}
              value={draft.services.bainaBox.priceFrom ?? ""}
              placeholder="e.g. ₹599 / box"
              onChange={(e) =>
                patch("services", {
                  bainaBox: {
                    ...draft.services.bainaBox,
                    priceFrom: e.target.value,
                  },
                })
              }
            />
          </Field>
          <ImageField
            value={draft.services.bainaBox.image}
            onChange={(v) =>
              patch("services", {
                bainaBox: { ...draft.services.bainaBox, image: v },
              })
            }
          />
        </SubCard>
      </SectionCard>

      {/* ── Occasions ───────────────────────────────────────────────────── */}
      <SectionCard title="Occasions">
        <TextRow
          label="Heading"
          en={draft.occasions.heading}
          hi={draft.occasions.headingHi}
          onEn={(v) => patch("occasions", { heading: v })}
          onHi={(v) => patch("occasions", { headingHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.occasions.subtitle}
          hi={draft.occasions.subtitleHi}
          onEn={(v) => patch("occasions", { subtitle: v })}
          onHi={(v) => patch("occasions", { subtitleHi: v })}
        />
        <ItemList
          label="Occasion"
          items={draft.occasions.items}
          onChange={(items) => patch("occasions", { items })}
          makeNew={(): HomeOccasion => ({
            id: `occ-${Date.now()}`,
            name: "New occasion",
            nameHi: "नया अवसर",
            image: "",
          })}
          renderItem={(o, set) => (
            <>
              <TextRow
                label="Name"
                en={o.name}
                hi={o.nameHi}
                onEn={(v) => set({ name: v })}
                onHi={(v) => set({ nameHi: v })}
              />
              <ImageField
                value={o.image}
                onChange={(v) => set({ image: v })}
              />
            </>
          )}
        />
      </SectionCard>

      {/* ── Baina Box Brands ────────────────────────────────────────────── */}
      <SectionCard title="Baina Box Brands">
        <p className="text-xs text-ink-soft">
          The &ldquo;Celebrate with Sweetness &amp; Love&rdquo; promo band. Edit
          the copy and the famous-brand cards (name, logo &amp; photo).
        </p>
        <TextRow
          label="Heading — line 1"
          en={draft.bainaBoxes.heading}
          hi={draft.bainaBoxes.headingHi}
          onEn={(v) => patch("bainaBoxes", { heading: v })}
          onHi={(v) => patch("bainaBoxes", { headingHi: v })}
        />
        <TextRow
          label="Heading — line 2 (accent)"
          en={draft.bainaBoxes.headingEm}
          hi={draft.bainaBoxes.headingEmHi}
          onEn={(v) => patch("bainaBoxes", { headingEm: v })}
          onHi={(v) => patch("bainaBoxes", { headingEmHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.bainaBoxes.subtitle}
          hi={draft.bainaBoxes.subtitleHi}
          onEn={(v) => patch("bainaBoxes", { subtitle: v })}
          onHi={(v) => patch("bainaBoxes", { subtitleHi: v })}
        />
        <TextRow
          label="Button label"
          en={draft.bainaBoxes.cta}
          hi={draft.bainaBoxes.ctaHi}
          onEn={(v) => patch("bainaBoxes", { cta: v })}
          onHi={(v) => patch("bainaBoxes", { ctaHi: v })}
        />
        <ItemList
          label="Brand"
          items={draft.bainaBoxes.brands}
          onChange={(brands) => patch("bainaBoxes", { brands })}
          makeNew={(): HomeBrand => ({
            id: `brand-${Date.now()}`,
            name: "New brand",
            nameHi: "नया ब्रांड",
            logo: "",
            image: "",
          })}
          renderItem={(b, set) => (
            <>
              <TextRow
                label="Name"
                en={b.name}
                hi={b.nameHi}
                onEn={(v) => set({ name: v })}
                onHi={(v) => set({ nameHi: v })}
              />
              <ImageField
                label="Box photo"
                value={b.image}
                onChange={(v) => set({ image: v })}
              />
              <ImageField
                label="Brand logo"
                value={b.logo}
                hint="Shown in the circle beside the name. Leave empty to use the name's initials."
                onChange={(v) => set({ logo: v })}
              />
            </>
          )}
        />
      </SectionCard>

      {/* ── Baina Box by Bhojpatra ──────────────────────────────────────── */}
      <SectionCard title="Baina Box by Bhojpatra">
        <p className="text-xs text-ink-soft">
          The &ldquo;Baina Box, specially by Bhojpatra&rdquo; signature card. It
          appears in the vendor dashboard and atop a Baina Box catalogue search.
          Its button always opens the Baina Box catalogue.
        </p>
        <Toggle
          label="Show the Baina Box signature card"
          checked={draft.bainaBoxSpecial.enabled}
          onChange={(enabled) => patch("bainaBoxSpecial", { enabled })}
        />
        <TextRow
          label="Heading"
          en={draft.bainaBoxSpecial.heading}
          hi={draft.bainaBoxSpecial.headingHi}
          onEn={(v) => patch("bainaBoxSpecial", { heading: v })}
          onHi={(v) => patch("bainaBoxSpecial", { headingHi: v })}
        />
        <AreaRow
          label="Details"
          en={draft.bainaBoxSpecial.body}
          hi={draft.bainaBoxSpecial.bodyHi}
          onEn={(v) => patch("bainaBoxSpecial", { body: v })}
          onHi={(v) => patch("bainaBoxSpecial", { bodyHi: v })}
        />
        <TextRow
          label="Button label"
          en={draft.bainaBoxSpecial.cta}
          hi={draft.bainaBoxSpecial.ctaHi}
          onEn={(v) => patch("bainaBoxSpecial", { cta: v })}
          onHi={(v) => patch("bainaBoxSpecial", { ctaHi: v })}
        />
        <ImageField
          label="Image"
          value={draft.bainaBoxSpecial.image}
          onChange={(v) => patch("bainaBoxSpecial", { image: v })}
        />
      </SectionCard>

      {/* ── Packages ────────────────────────────────────────────────────── */}
      <SectionCard title="Packages">
        <TextRow
          label="Heading"
          en={draft.packages.heading}
          hi={draft.packages.headingHi}
          onEn={(v) => patch("packages", { heading: v })}
          onHi={(v) => patch("packages", { headingHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.packages.subtitle}
          hi={draft.packages.subtitleHi}
          onEn={(v) => patch("packages", { subtitle: v })}
          onHi={(v) => patch("packages", { subtitleHi: v })}
        />
        <p className="text-xs text-ink-soft">
          The menu / feature list for each tier is managed under Menu &amp;
          Catalog. Here you can edit each tier&apos;s name and price.
        </p>
        {draft.packages.tiers.map((tier, i) => (
          <SubCard key={tier.id} title={`Tier — ${tier.name || tier.id}`}>
            <TextRow
              label="Name"
              en={tier.name}
              hi={tier.nameHi}
              onEn={(v) =>
                patch("packages", {
                  tiers: draft.packages.tiers.map((x, j) =>
                    j === i ? { ...x, name: v } : x,
                  ),
                })
              }
              onHi={(v) =>
                patch("packages", {
                  tiers: draft.packages.tiers.map((x, j) =>
                    j === i ? { ...x, nameHi: v } : x,
                  ),
                })
              }
            />
            <Field label="Price">
              <input
                className={inputClass}
                value={tier.price}
                onChange={(e) =>
                  patch("packages", {
                    tiers: draft.packages.tiers.map((x, j) =>
                      j === i ? { ...x, price: e.target.value } : x,
                    ),
                  })
                }
              />
            </Field>
          </SubCard>
        ))}
      </SectionCard>

      {/* ── Gallery ─────────────────────────────────────────────────────── */}
      <SectionCard title="Real Events (Gallery)">
        <TextRow
          label="Eyebrow"
          en={draft.gallery.eyebrow}
          hi={draft.gallery.eyebrowHi}
          onEn={(v) => patch("gallery", { eyebrow: v })}
          onHi={(v) => patch("gallery", { eyebrowHi: v })}
        />
        <TextRow
          label="Heading"
          en={draft.gallery.heading}
          hi={draft.gallery.headingHi}
          onEn={(v) => patch("gallery", { heading: v })}
          onHi={(v) => patch("gallery", { headingHi: v })}
        />
        <TextRow
          label="Heading — accent words"
          en={draft.gallery.headingEm}
          hi={draft.gallery.headingEmHi}
          onEn={(v) => patch("gallery", { headingEm: v })}
          onHi={(v) => patch("gallery", { headingEmHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.gallery.subtitle}
          hi={draft.gallery.subtitleHi}
          onEn={(v) => patch("gallery", { subtitle: v })}
          onHi={(v) => patch("gallery", { subtitleHi: v })}
        />
        <TextRow
          label="Button label"
          en={draft.gallery.cta}
          hi={draft.gallery.ctaHi}
          onEn={(v) => patch("gallery", { cta: v })}
          onHi={(v) => patch("gallery", { ctaHi: v })}
        />

        <p className="text-xs text-ink-soft">
          The Real Events section has three separate photo groups — edit each on
          its own below. Every photo has a title, a small tag (e.g. &ldquo;Wedding
          · 500 pax&rdquo;) and an image.
        </p>

        <SubCard title="Cluster — above the button">
          <p className="text-xs text-ink-soft">
            The fan-out cluster shown above the &ldquo;{draft.gallery.cta}&rdquo;
            button. The first 7 photos are laid out.
          </p>
          <ItemList
            label="Cluster photo"
            items={draft.gallery.cluster}
            onChange={(cluster) => patch("gallery", { cluster })}
            makeNew={() => makeGalleryItem("gc")}
            renderItem={renderGalleryItem}
          />
        </SubCard>

        <SubCard title="Row 1 — top ribbon (scrolls left → right)">
          <ItemList
            label="Row 1 photo"
            items={draft.gallery.rowOne}
            onChange={(rowOne) => patch("gallery", { rowOne })}
            makeNew={() => makeGalleryItem("gr1")}
            renderItem={renderGalleryItem}
          />
        </SubCard>

        <SubCard title="Row 2 — bottom ribbon (scrolls right → left)">
          <ItemList
            label="Row 2 photo"
            items={draft.gallery.rowTwo}
            onChange={(rowTwo) => patch("gallery", { rowTwo })}
            makeNew={() => makeGalleryItem("gr2")}
            renderItem={renderGalleryItem}
          />
        </SubCard>
      </SectionCard>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      <SectionCard title="Testimonials">
        <TextRow
          label="Eyebrow"
          en={draft.testimonials.eyebrow}
          hi={draft.testimonials.eyebrowHi}
          onEn={(v) => patch("testimonials", { eyebrow: v })}
          onHi={(v) => patch("testimonials", { eyebrowHi: v })}
        />
        <TextRow
          label="Heading"
          en={draft.testimonials.heading}
          hi={draft.testimonials.headingHi}
          onEn={(v) => patch("testimonials", { heading: v })}
          onHi={(v) => patch("testimonials", { headingHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.testimonials.subtitle}
          hi={draft.testimonials.subtitleHi}
          onEn={(v) => patch("testimonials", { subtitle: v })}
          onHi={(v) => patch("testimonials", { subtitleHi: v })}
        />

        <ItemList
          label="Testimonial"
          items={draft.testimonials.items}
          onChange={(items) => patch("testimonials", { items })}
          makeNew={(): HomeTestimonial => ({
            id: `t-${Date.now()}`,
            name: "New customer",
            role: "Occasion · City",
            roleHi: "अवसर · शहर",
            quote: "",
            quoteHi: "",
            rating: 5,
          })}
          renderItem={(t, set) => (
            <>
              <Field label="Name">
                <input
                  className={inputClass}
                  value={t.name}
                  onChange={(e) => set({ name: e.target.value })}
                />
              </Field>
              <TextRow
                label="Role / context"
                en={t.role}
                hi={t.roleHi}
                onEn={(v) => set({ role: v })}
                onHi={(v) => set({ roleHi: v })}
              />
              <AreaRow
                label="Quote"
                en={t.quote}
                hi={t.quoteHi}
                onEn={(v) => set({ quote: v })}
                onHi={(v) => set({ quoteHi: v })}
              />
              <Field label="Rating (1–5)">
                <input
                  type="number"
                  min={1}
                  max={5}
                  className={inputClass}
                  value={t.rating}
                  onChange={(e) =>
                    set({
                      rating: Math.min(5, Math.max(1, Number(e.target.value))),
                    })
                  }
                />
              </Field>
            </>
          )}
        />
      </SectionCard>

      {/* ── Promo banner ────────────────────────────────────────────────── */}
      <SectionCard title="Promotional Banner">
        <p className="text-xs text-ink-soft">
          The offer band under the hero. Upload a wide banner image (headline
          and artwork baked into the design). The subtitle appears in the lead
          strip below the banner; heading is used for accessibility.
        </p>
        <ImageField
          label="Banner image"
          value={draft.promo.image}
          highQuality
          hint="Full-width banner shown under the hero. Upload a wide, high-resolution JPG/PNG (≈1600px+ wide) — it's kept crisp for large screens. Or paste a URL. Leave empty for the text-only invitation layout."
          onChange={(v) => patch("promo", { image: v })}
        />
        <TextRow
          label="Heading"
          en={draft.promo.heading}
          hi={draft.promo.headingHi}
          onEn={(v) => patch("promo", { heading: v })}
          onHi={(v) => patch("promo", { headingHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.promo.subtitle}
          hi={draft.promo.subtitleHi}
          onEn={(v) => patch("promo", { subtitle: v })}
          onHi={(v) => patch("promo", { subtitleHi: v })}
        />
      </SectionCard>

      {/* ── Booking form ────────────────────────────────────────────────── */}
      <SectionCard title="Booking Form">
        <TextRow
          label="Heading"
          en={draft.booking.heading}
          hi={draft.booking.headingHi}
          onEn={(v) => patch("booking", { heading: v })}
          onHi={(v) => patch("booking", { headingHi: v })}
        />
        <AreaRow
          label="Subtitle"
          en={draft.booking.subtitle}
          hi={draft.booking.subtitleHi}
          onEn={(v) => patch("booking", { subtitle: v })}
          onHi={(v) => patch("booking", { subtitleHi: v })}
        />
      </SectionCard>
    </div>
  );
}

/* ── Building blocks ──────────────────────────────────────────────────────── */

/** A blank Real Events photo; `prefix` keeps ids distinct per group. */
function makeGalleryItem(prefix: string): HomeGalleryItem {
  return {
    id: `${prefix}-${Date.now()}`,
    title: "New image",
    titleHi: "नई तस्वीर",
    caption: "",
    captionHi: "",
    image: "",
  };
}

/** Shared editor for a single Real Events photo (title + tag + image). */
function renderGalleryItem(
  g: HomeGalleryItem,
  set: (patch: Partial<HomeGalleryItem>) => void,
) {
  return (
    <>
      <TextRow
        label="Title"
        en={g.title}
        hi={g.titleHi}
        onEn={(v) => set({ title: v })}
        onHi={(v) => set({ titleHi: v })}
      />
      <TextRow
        label="Tag (small label, e.g. “Wedding · 500 pax”)"
        en={g.caption}
        hi={g.captionHi}
        onEn={(v) => set({ caption: v })}
        onHi={(v) => set({ captionHi: v })}
      />
      <ImageField value={g.image} onChange={(v) => set({ image: v })} />
    </>
  );
}

function SectionCard({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-cream-3 bg-white"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-medium text-ink marker:hidden hover:bg-cream/40">
        {title}
        <span className="text-maroon transition-transform duration-200 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="space-y-4 border-t border-cream-3 px-5 py-5">
        {children}
      </div>
    </details>
  );
}

function SubCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-lg border border-cream-3 bg-cream/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}

/** A labelled on/off switch. */
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-maroon" : "bg-cream-3"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** A single label with side-by-side English + Hindi inputs. */
function TextRow({
  label,
  en,
  hi,
  onEn,
  onHi,
}: {
  label: string;
  en: string;
  hi: string;
  onEn: (v: string) => void;
  onHi: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          className={inputClass}
          value={en}
          placeholder="English"
          onChange={(e) => onEn(e.target.value)}
        />
        <input
          className={inputClass}
          value={hi}
          placeholder="हिन्दी"
          onChange={(e) => onHi(e.target.value)}
        />
      </div>
    </Field>
  );
}

/** Like TextRow, but multi-line. */
function AreaRow({
  label,
  en,
  hi,
  onEn,
  onHi,
}: {
  label: string;
  en: string;
  hi: string;
  onEn: (v: string) => void;
  onHi: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <textarea
          rows={3}
          className={inputClass + " resize-y"}
          value={en}
          placeholder="English"
          onChange={(e) => onEn(e.target.value)}
        />
        <textarea
          rows={3}
          className={inputClass + " resize-y"}
          value={hi}
          placeholder="हिन्दी"
          onChange={(e) => onHi(e.target.value)}
        />
      </div>
    </Field>
  );
}

/** Editable list with add / remove and ↑ / ↓ reorder. */
function ItemList<T extends { id: string }>({
  label,
  items,
  onChange,
  makeNew,
  renderItem,
}: {
  label: string;
  items: T[];
  onChange: (next: T[]) => void;
  makeNew: () => T;
  renderItem: (item: T, set: (patch: Partial<T>) => void) => ReactNode;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  return (
    <div className="space-y-3 border-t border-cream-3 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {label}s ({items.length})
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...items, makeNew()])}
        >
          + Add {label.toLowerCase()}
        </Button>
      </div>

      {items.map((item, i) => (
        <div
          key={item.id}
          className="space-y-3 rounded-lg border border-cream-3 bg-cream/30 p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-soft">
              {label} {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={i === 0}
                aria-label={`Move ${label.toLowerCase()} up`}
                onClick={() => move(i, i - 1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={i === items.length - 1}
                aria-label={`Move ${label.toLowerCase()} down`}
                onClick={() => move(i, i + 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                Remove
              </Button>
            </div>
          </div>
          {renderItem(item, (p) =>
            onChange(items.map((x, j) => (j === i ? { ...x, ...p } : x))),
          )}
        </div>
      ))}
    </div>
  );
}
