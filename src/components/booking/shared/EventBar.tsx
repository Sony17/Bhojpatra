"use client";

import { useEffect, useState } from "react";
import ThemedSelect from "@/components/ThemedSelect";
import DatePicker from "@/components/DatePicker";
import {
  bookingMealTimes,
  bookingTimeSlots,
  bookingFoodPreferences,
  formatClockTime,
} from "@/lib/data";
import {
  OTHER_LOCATION_ID,
  type LocationOption,
} from "@/lib/locations";
import { useDetectedLocation } from "@/lib/detectedLocation";
import {
  OTHER_OCCASION_ID,
  type OccasionOption,
} from "@/lib/occasions";
import { inr } from "@/lib/money";
import { formatEventDate } from "@/lib/bookingPricing";
import {
  PREF_BOTH,
  foodPreferenceForSplit,
  splitSummary,
  vegCount,
  type NonVegCount,
} from "@/lib/dietSplit";

type Lang = "en" | "hi";

/* ─── Craft-my-plate count box ────────────────────────────────────────────
 * Buffered numeric input for one side of the veg / non-veg split, so a guest
 * can clear the box and type freely (same pattern as the head-count field);
 * the committed value is clamped into 0..guests on blur.
 */
function SplitCountInput({
  value,
  max,
  onCommit,
  ariaLabel,
}: {
  value: number;
  max: number;
  onCommit: (n: number) => void;
  ariaLabel: string;
}) {
  // Buffer the keystrokes, but re-sync when the committed value changes
  // underneath us (slider, the other box, a head-count change). Adjusting
  // state during render — rather than in an effect — is React's own pattern
  // for this and avoids a second render pass.
  const [text, setText] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value));
  }
  const commit = (raw: string) => {
    const n = Math.round(Number(raw.replace(/[^0-9]/g, "")));
    onCommit(Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : value);
  };
  return (
    <input
      type="number"
      inputMode="numeric"
      value={text}
      min={0}
      max={max}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => commit(text)}
      aria-label={ariaLabel}
      className="h-7 w-12 shrink-0 rounded-full border border-cream bg-white text-center text-xs font-bold tabular-nums text-ink shadow-soft outline-none transition focus:border-maroon [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

/* ─── "Other" free-text field ─────────────────────────────────────────────
 * Replaces a select once the guest picks "Other" — a text box with a Change
 * pill that drops them back to the list.
 */
function OtherField({
  value,
  onChange,
  onReset,
  placeholder,
  changeLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  placeholder: string;
  changeLabel: string;
}) {
  return (
    <div className="relative mt-1.5">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-h-12 w-full rounded-control border border-maroon/40 bg-white py-2.5 pl-3.5 pr-[4.75rem] text-sm text-ink shadow-soft outline-none transition focus:border-maroon focus:shadow-card"
      />
      <button
        type="button"
        onClick={onReset}
        aria-label={changeLabel}
        className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center rounded-full border border-cream bg-cream/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-maroon transition hover:bg-cream active:scale-95"
      >
        {changeLabel}
      </button>
    </div>
  );
}

/* ─── Event brief ─────────────────────────────────────────────────────────
 * Occasion / date / city / guests / serving time / food preference, editable on
 * every step of either booking wizard. Shared by /book and /book/stall so the
 * brief is gathered once, the same way, whichever plan the guest is on.
 */
export default function EventBar({
  lang,
  t,
  occasionId,
  setOccasionId,
  customOccasion,
  setCustomOccasion,
  occasionList,
  eventDate,
  setEventDate,
  mealTime,
  setMealTime,
  eventTime,
  setEventTime,
  foodPreference,
  setFoodPreference,
  nonVegGuests,
  setNonVegMix,
  cityId,
  setCityId,
  customCity,
  setCustomCity,
  locations,
  guests,
  setGuests,
  paxMin,
  paxMax,
  leadWarning,
  showGuests = true,
  flush = false,
  collapsible = false,
  collapseAt = "lg",
  embedded = false,
}: {
  lang: Lang;
  t: (en: string, hi: string) => string;
  occasionId: string;
  setOccasionId: (v: string) => void;
  customOccasion: string;
  setCustomOccasion: (v: string) => void;
  occasionList: OccasionOption[];
  eventDate: string;
  setEventDate: (v: string) => void;
  mealTime: string;
  setMealTime: (v: string) => void;
  eventTime: string;
  setEventTime: (v: string) => void;
  foodPreference: string;
  setFoodPreference: (v: string) => void;
  /** Veg / non-veg guest split ("Craft my plate") — how many of `guests` eat
   *  non-veg, ALREADY DERIVED by the parent via `resolveNonVeg` from the food
   *  preference plus the dialled-in mix. `null` = not declared, and nothing
   *  downstream gets diet-filtered. Read-only here. */
  nonVegGuests: NonVegCount;
  /** Writes the guest's dialled-in non-veg count (the "Both" mix). Editing the
   *  split always writes this AND `setFoodPreference` together, so the label
   *  and the counts are one decision rather than two states to reconcile. */
  setNonVegMix: (v: NonVegCount) => void;
  cityId: string;
  setCityId: (v: string) => void;
  customCity: string;
  setCustomCity: (v: string) => void;
  locations: LocationOption[];
  guests: number;
  setGuests: (v: number) => void;
  paxMin: number;
  paxMax: number;
  leadWarning: string;
  /** The headcount is fixed and echoed in the order summary by the Confirm
   *  step, so the editable field is hidden there to avoid a redundant control. */
  showGuests?: boolean;
  /** Drops the card's top margin so it can sit inside a grid whose gap already
   *  supplies the spacing (used when the event brief is reordered on mobile). */
  flush?: boolean;
  /** On mobile only, collapse to a one-line summary (all values shown inline)
   *  that expands on tap. Desktop always renders the full editable card. */
  collapsible?: boolean;
  /** Breakpoint above which the full editable card is always shown. `"lg"` (the
   *  default) collapses on phones + small tablets; `"sm"` collapses on phones
   *  only, leaving every larger view (tablet / desktop) exactly as-is. */
  collapseAt?: "sm" | "lg";
  /** Render bare (no card chrome) as one row of a shared summary card — the
   *  collapsed line gets a pencil affordance and expands to the full editor.
   *  Used by the combined mobile brief + package card on the builder steps. */
  embedded?: boolean;
}) {
  // Trigger styling for the themed dropdowns — matches the other field boxes
  // (bordered, cream, shadowed) so the select reads as one of the inputs.
  const selectButtonClass =
    "min-h-12 w-full rounded-control border border-cream bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none transition focus:border-maroon focus:shadow-card";
  const labelClass =
    "text-[11px] font-bold uppercase tracking-[0.08em] text-ink/60";

  // GPS "use my location" for the City field. autoDetect is off — the header
  // bar already runs the silent IP pre-fill, and detecting here persists to the
  // same shared store, so the header mirrors it (and the parent's location
  // listener folds the result back into `cityId`).
  const { status: geoStatus, detect: detectLocation } = useDetectedLocation(
    locations,
    { autoDetect: false },
  );
  const detecting = geoStatus === "detecting";
  const geoMessage =
    geoStatus === "denied"
      ? t(
          "Location permission blocked — pick your city below.",
          "लोकेशन की अनुमति नहीं मिली — नीचे अपना शहर चुनें।",
        )
      : geoStatus === "failed" || geoStatus === "unsupported"
        ? t(
            "Couldn't detect your location — pick your city below.",
            "आपकी लोकेशन नहीं मिल पाई — नीचे अपना शहर चुनें।",
          )
        : "";

  // Local editing buffer for the typed headcount, so a guest can clear the box
  // and type an explicit number without every keystroke snapping to the package
  // minimum. Re-synced whenever the committed value changes (slider / +/−).
  const [guestsText, setGuestsText] = useState(String(guests));
  useEffect(() => setGuestsText(String(guests)), [guests]);
  const clampGuests = (n: number) => Math.max(paxMin, Math.min(paxMax, n));
  // While typing we only push *in-range* values up to the parent, so a partial
  // entry like "2" (below the 150 minimum) isn't snapped up mid-keystroke — it's
  // held in the text buffer and only clamped into range when the field blurs.
  const commitGuestsText = (raw: string) => {
    // Keep digits only and drop any leading zero(s) so the field never shows a
    // stray "0" in front of the count (e.g. "0150" → "150", "0" → "0").
    const cleaned = raw.replace(/[^0-9]/g, "").replace(/^0+(?=\d)/, "");
    setGuestsText(cleaned);
    const n = Math.round(Number(cleaned));
    if (Number.isFinite(n) && n >= paxMin && n <= paxMax) setGuests(n);
  };
  const blurGuests = () => {
    const n = Math.round(Number(guestsText.replace(/[^0-9]/g, "")));
    const next = !Number.isFinite(n) || n <= 0 ? guests : clampGuests(n);
    setGuests(next);
    setGuestsText(String(next));
  };
  const stepGuests = (delta: number) => setGuests(clampGuests(guests + delta));

  // `nonVegGuests` arrives already derived from the preference + the guest's
  // dialled-in mix (see `resolveNonVeg`), so there is nothing to sync here —
  // a split edit just writes both halves of the source state at once: the
  // mix itself, and the preference label that count now derives to.
  const commitNonVeg = (nv: number) => {
    const clamped = Math.max(0, Math.min(guests, Math.round(nv)));
    setNonVegMix(clamped);
    setFoodPreference(foodPreferenceForSplit(clamped, guests));
  };
  const vegGuests = vegCount(nonVegGuests, guests);
  const splitSet = nonVegGuests !== null;
  const vegPct = guests > 0 ? Math.round((vegGuests / guests) * 100) : 0;

  // Collapsed one-line summary (mobile only) — every set value is shown inline
  // so the guest sees their whole event brief without expanding the card.
  const [open, setOpen] = useState(false);
  const occasionName =
    occasionId === OTHER_OCCASION_ID
      ? customOccasion.trim()
      : (occasionList.find((x) => x.id === occasionId) &&
          (lang === "hi"
            ? occasionList.find((x) => x.id === occasionId)!.nameHi
            : occasionList.find((x) => x.id === occasionId)!.name)) || "";
  const cityName =
    cityId === OTHER_LOCATION_ID
      ? customCity.trim()
      : (locations.find((x) => x.id === cityId) &&
          (lang === "hi"
            ? locations.find((x) => x.id === cityId)!.nameHi
            : locations.find((x) => x.id === cityId)!.name)) || "";
  const dateName = eventDate ? formatEventDate(eventDate) : "";
  // Serving time for the collapsed summary — the meal's localized name plus the
  // clock slot (the stored `mealTime` id is English, so we look up its label).
  const mealObj = bookingMealTimes.find((m) => m.id === mealTime);
  const mealLabel = mealObj ? (lang === "hi" ? mealObj.nameHi : mealObj.name) : "";
  const servingName = [mealLabel, formatClockTime(eventTime)]
    .filter(Boolean)
    .join(" · ");
  // Food preference for the collapsed summary — the stored value is the English
  // label, so map it to the Hindi one for the HI locale.
  const foodObj = bookingFoodPreferences.find((f) => f.value === foodPreference);
  // "Both" alone says little — carry the actual plate mix into the summary.
  const splitText =
    foodPreference === PREF_BOTH ? splitSummary(nonVegGuests, guests, t) : "";
  const foodName = foodObj
    ? (lang === "hi" ? foodObj.nameHi : foodObj.value) +
      (splitText ? ` (${splitText})` : "")
    : "";
  const summaryParts = [
    occasionName,
    dateName,
    servingName,
    foodName,
    cityName,
    showGuests ? `${guests} ${t("guests", "मेहमान")}` : "",
  ].filter(Boolean);
  const summaryLine =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : t("Add your event details", "अपने इवेंट की जानकारी जोड़ें");

  return (
    <div
      className={
        embedded
          ? "relative"
          : "relative rounded-[1.5rem] border border-cream bg-white p-4 shadow-card sm:p-6 " +
            (flush ? "" : "mt-5 sm:mt-7")
      }
    >
      {Boolean(leadWarning) && !embedded && (
        <span
          className="absolute inset-y-0 left-0 w-1 rounded-l-[1.5rem] bg-maroon"
          aria-hidden="true"
        />
      )}
      {/* Mobile collapsed summary — the whole brief on one tappable line; hidden
          on desktop, where the full card is always shown. Embedded rows keep it
          at every width and swap the chevron for a pencil edit cue. */}
      {(collapsible || embedded) && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={
            "flex w-full items-center justify-between gap-3 text-left " +
            (embedded ? "" : collapseAt === "sm" ? "sm:hidden" : "lg:hidden")
          }
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="eyebrow shrink-0 text-[10px] font-bold text-maroon">
              {t("YOUR EVENT", "आपका इवेंट")}
            </span>
            <span className="min-w-0 text-xs text-ink/70 line-clamp-2 sm:line-clamp-none break-words">
              {summaryLine}
            </span>
          </span>
          {embedded ? (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0 text-maroon"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className={
                "h-4 w-4 shrink-0 text-maroon transition-transform " +
                (open ? "rotate-180" : "")
              }
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          )}
        </button>
      )}
      <div
        className={
          "flex items-center justify-between gap-4 " +
          (embedded
            ? "hidden"
            : collapsible
              ? collapseAt === "sm"
                ? "hidden sm:flex"
                : "hidden lg:flex"
              : "")
        }
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="eyebrow shrink-0 text-[10px] font-bold text-maroon sm:text-xs">
            {t("YOUR EVENT", "आपका इवेंट")}
          </p>
          <p className="min-w-0 truncate text-xs text-ink/50 sm:text-sm">
            {t(
              "Tell us the essentials — you can edit these anytime.",
              "ज़रूरी जानकारी दें — इसे कभी भी बदल सकते हैं।",
            )}
          </p>
        </div>
        <span className="hidden rounded-full bg-cream/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-maroon sm:inline">
          {t("Event brief", "इवेंट ब्रीफ़")}
        </span>
      </div>
      <div
        className={
          "mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 xl:gap-3 " +
          // Web view keeps the whole brief on one row. Guests and the plate
          // split get the widest share (their steppers, count boxes and slider
          // bars have real minimum widths), while Meal / Time / Food are
          // trimmed narrower. With the plate field there are eight of them, so
          // the single row starts at xl (each column minmax(0,…) so the selects
          // truncate instead of holding the row open); lg lays them out
          // four-up on two rows rather than squeezing Food off the end. The Review step drops
          // Guests + plate and keeps its six on one row from lg, as before.
          (showGuests
            ? "lg:grid-cols-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.85fr)_minmax(0,1.05fr)_minmax(0,1.2fr)_minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,0.9fr)_minmax(0,0.72fr)] "
            : "lg:grid-cols-[1fr_1fr_1fr_0.85fr_0.85fr_0.85fr] ") +
          (embedded
            ? open
              ? ""
              : "hidden"
            : collapsible && !open
              ? collapseAt === "sm"
                ? "hidden sm:grid"
                : "hidden lg:grid"
              : "")
        }
      >
        <label className="block">
          <span className={labelClass}>{t("Occasion", "अवसर")}</span>
          {occasionId === OTHER_OCCASION_ID ? (
            <OtherField
              value={customOccasion}
              onChange={setCustomOccasion}
              onReset={() => {
                setOccasionId("");
                setCustomOccasion("");
              }}
              placeholder={t("Type your occasion", "अपना अवसर लिखें")}
              changeLabel={t("Change", "बदलें")}
            />
          ) : (
            <ThemedSelect
              value={occasionId}
              onChange={setOccasionId}
              ariaLabel={t("Occasion", "अवसर")}
              placeholder={t("Select occasion", "अवसर चुनें")}
              className="mt-1.5"
              buttonClassName={selectButtonClass}
              options={[
                ...occasionList.map((o) => ({
                  value: o.id,
                  label: lang === "hi" ? o.nameHi : o.name,
                })),
                { value: OTHER_OCCASION_ID, label: t("Other", "अन्य") },
              ]}
            />
          )}
        </label>

        <div className="block">
          <span className={labelClass}>{t("Date", "तारीख")}</span>
          {/* Branded calendar (same on-brand popup as the Hero booking bar)
              instead of the OS-grey native date control. Controlled by the
              carried-over event date; the floor is just today (no past dates,
              `minDaysAhead={0}`) — the lead-time shortfall is surfaced softly by
              `leadWarning` below, per the date-floor note in the wizards. */}
          <DatePicker
            className={
              "mt-1.5 min-h-12 w-full rounded-control border bg-white shadow-soft transition focus-within:shadow-card " +
              (leadWarning ? "border-maroon" : "border-cream focus-within:border-maroon")
            }
            buttonClassName="min-h-12 w-full px-3.5 py-2.5 pr-11 text-sm"
            iconClassName="right-3.5"
            placeholder={t("Select date", "तारीख चुनें")}
            ariaLabel={t("Event date", "इवेंट की तारीख")}
            direction="down"
            align="left"
            minDaysAhead={0}
            valueIso={eventDate}
            onChange={(d) => {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              setEventDate(`${y}-${m}-${day}`);
            }}
          />
          {leadWarning && (
            <span className="mt-1.5 flex items-start gap-1.5 text-xs text-maroon">
              <span aria-hidden="true">★</span>
              <span>{leadWarning}</span>
            </span>
          )}
        </div>

        <div className="block">
          <div className="flex items-center justify-between gap-2">
            <span className={labelClass}>{t("City / Location", "शहर / लोकेशन")}</span>
            <button
              type="button"
              onClick={() => void detectLocation()}
              disabled={detecting}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.06em] text-maroon transition hover:underline disabled:opacity-60"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              {detecting
                ? t("Detecting…", "पता लगा रहे हैं…")
                : t("Use my location", "मेरी लोकेशन")}
            </button>
          </div>
          {cityId === OTHER_LOCATION_ID ? (
            <OtherField
              value={customCity}
              onChange={setCustomCity}
              onReset={() => {
                setCityId("");
                setCustomCity("");
              }}
              placeholder={t("Type your city or state", "अपना शहर या राज्य लिखें")}
              changeLabel={t("Change", "बदलें")}
            />
          ) : (
            <ThemedSelect
              value={cityId}
              onChange={setCityId}
              ariaLabel={t("City / Location", "शहर / लोकेशन")}
              placeholder={t("Select city", "शहर चुनें")}
              className="mt-1.5"
              buttonClassName={selectButtonClass}
              options={[
                ...locations.map((c) => ({
                  value: c.id,
                  label: lang === "hi" ? c.nameHi : c.name,
                })),
                { value: OTHER_LOCATION_ID, label: t("Other", "अन्य") },
              ]}
            />
          )}
          {geoMessage && (
            <span className="mt-1.5 block text-[11px] text-maroon/80">
              {geoMessage}
            </span>
          )}
        </div>

        {showGuests && (
          <div className="flex flex-col justify-center gap-3 rounded-control border border-cream bg-cream/20 px-4 py-3 shadow-soft">
            {/* Label above the stepper rather than beside it: side by side the
                card's minimum width grew past its share of the eight-field
                row and squeezed the last field off the end. */}
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-maroon">
                {t("Guests", "मेहमान")}
              </p>
              <p className="shrink-0 text-caption text-ink/50">
                {inr.format(paxMin)}–{inr.format(paxMax)}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex w-full items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => stepGuests(-10)}
                  disabled={guests <= paxMin}
                  aria-label={t("Decrease guests", "मेहमान घटाएं")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream bg-white text-lg font-bold leading-none text-maroon shadow-soft transition hover:bg-cream/40 active:scale-95 disabled:opacity-30"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={guestsText}
                  min={paxMin}
                  max={paxMax}
                  onChange={(e) => commitGuestsText(e.target.value)}
                  onBlur={blurGuests}
                  aria-label={t("Number of guests", "मेहमानों की संख्या")}
                  className="h-9 w-16 rounded-full border border-cream bg-white text-center text-sm font-bold tabular-nums text-ink shadow-soft outline-none transition focus:border-maroon [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => stepGuests(10)}
                  disabled={guests >= paxMax}
                  aria-label={t("Increase guests", "मेहमान बढ़ाएं")}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream bg-white text-lg font-bold leading-none text-maroon shadow-soft transition hover:bg-cream/40 active:scale-95 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
            <input
              type="range"
              min={paxMin}
              max={paxMax}
              step={10}
              value={guests}
              onChange={(e) => setGuests(clampGuests(Number(e.target.value)))}
              aria-label={t("Number of guests", "मेहमानों की संख्या")}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-cream outline-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-maroon [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-maroon [&::-webkit-slider-thumb]:shadow-soft"
            />

          </div>
        )}

        {/* Craft my plate — the veg / non-veg split of the head-count, its own
            field in the brief rather than a shelf inside Guests: it is a
            decision in its own right (menus and stall rosters filter STRICTLY
            off it), and the two cards read as a pair — how many are coming,
            and who eats what. Undeclared, three chips set the preference;
            once set, a cream(veg) / red(non-veg) slider and two count boxes
            tune the exact mix. */}
        {showGuests && (
          <div className="flex flex-col justify-center gap-2.5 rounded-control border border-cream bg-cream/20 px-4 py-3 shadow-soft">
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-maroon">
                {t("Craft my plate", "अपनी थाली बनाएं")}
              </p>
              {splitSet && (
                <button
                  type="button"
                  onClick={() => {
                    setFoodPreference("");
                    setNonVegMix(null);
                  }}
                  className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-ink/50 transition hover:text-maroon hover:underline"
                >
                  {t("Clear", "हटाएं")}
                </button>
              )}
            </div>
            {!splitSet ? (
              <>
                <p className="-mt-1 text-caption text-ink/50">
                  {t("Who eats what?", "कौन क्या खाएगा?")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bookingFoodPreferences.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFoodPreference(f.value)}
                      className="rounded-full border border-cream bg-white px-2.5 py-1 text-[11px] font-bold text-maroon shadow-soft transition hover:bg-cream/40 active:scale-95"
                    >
                      {lang === "hi" ? f.nameHi : f.value}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* The two halves as stacked rows — swatch, who they are, how
                    many. Side by side they'd never fit this column. */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm border border-maroon/40 bg-cream"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase text-ink/60">
                      {t("Veg", "वेज")}
                    </span>
                    <SplitCountInput
                      value={vegGuests}
                      max={guests}
                      onCommit={(n) => commitNonVeg(guests - n)}
                      ariaLabel={t("Vegetarian guests", "शाकाहारी मेहमान")}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm bg-maroon"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase text-ink/60">
                      {t("Non-veg", "नॉन-वेज")}
                    </span>
                    <SplitCountInput
                      value={guests - vegGuests}
                      max={guests}
                      onCommit={commitNonVeg}
                      ariaLabel={t("Non-veg guests", "मांसाहारी मेहमान")}
                    />
                  </label>
                </div>
                <input
                  type="range"
                  min={0}
                  max={guests}
                  step={1}
                  value={vegGuests}
                  onChange={(e) => commitNonVeg(guests - Number(e.target.value))}
                  aria-label={t("Vegetarian guests", "शाकाहारी मेहमान")}
                  aria-valuetext={`${vegGuests} ${t("veg", "वेज")}, ${guests - vegGuests} ${t("non-veg", "नॉन-वेज")}`}
                  style={{
                    // Track = the plate itself: cream share eats veg, red
                    // share eats non-veg. Both stops are brand hexes.
                    background: `linear-gradient(to right, #f0d09e 0%, #f0d09e ${vegPct}%, #b92025 ${vegPct}%, #b92025 100%)`,
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full outline-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-maroon [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-maroon [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-soft"
                />
              </>
            )}
          </div>
        )}

        {/* Serving time — the meal period plus a clock slot within it. Folded
            into the grid above so the whole brief sits on one row in web view;
            each select carries its own label. Optional; when set it rides onto
            the order, invoice ("Serving time") and admin/My-Bookings via
            `servingTimeLabel`. */}
        <div className="block">
          <span className={labelClass}>
            {t("Meal", "भोजन")}{" "}
            <span className="font-medium normal-case tracking-normal text-ink/40">
              ({t("optional", "वैकल्पिक")})
            </span>
          </span>
          {/* Meal period — Breakfast / Lunch / Dinner. */}
          <ThemedSelect
            value={mealTime}
            onChange={(v) => {
              setMealTime(v);
              // Clock slots are scoped to the meal, so drop a slot that no
              // longer falls within the newly chosen period.
              if (!(bookingTimeSlots[v] ?? []).includes(eventTime))
                setEventTime("");
            }}
            ariaLabel={t("Meal period", "भोजन अवधि")}
            placeholder={t("Select meal", "भोजन चुनें")}
            className="mt-1.5"
            buttonClassName={selectButtonClass}
            options={bookingMealTimes.map((m) => ({
              value: m.id,
              label: lang === "hi" ? m.nameHi : m.name,
            }))}
          />
        </div>

        <div className="block">
          <span className={labelClass}>{t("Time", "समय")}</span>
          {/* Time slot within the chosen meal — enabled once a meal is picked. */}
          <ThemedSelect
            value={eventTime}
            onChange={setEventTime}
            disabled={!mealTime}
            ariaLabel={t("Time slot", "समय स्लॉट")}
            placeholder={
              mealTime
                ? t("Select time slot", "समय स्लॉट चुनें")
                : t("Pick a meal first", "पहले भोजन चुनें")
            }
            className="mt-1.5"
            buttonClassName={selectButtonClass}
            options={(bookingTimeSlots[mealTime] ?? []).map((hhmm) => ({
              value: hhmm,
              label: formatClockTime(hhmm),
            }))}
          />
        </div>

        {/* Food preference — Pure Veg / Non-veg / Both. Optional; rides onto the
            order, invoice ("Food preference") and admin / My-Bookings. */}
        <div className="block">
          <span className={labelClass}>
            {t("Food", "खाना")}{" "}
            <span className="font-medium normal-case tracking-normal text-ink/40">
              ({t("optional", "वैकल्पिक")})
            </span>
          </span>
          <ThemedSelect
            value={foodPreference}
            onChange={setFoodPreference}
            ariaLabel={t("Food preference", "खाने की पसंद")}
            placeholder={t("Select preference", "पसंद चुनें")}
            className="mt-1.5"
            buttonClassName={selectButtonClass}
            options={bookingFoodPreferences.map((f) => ({
              value: f.value,
              label: lang === "hi" ? f.nameHi : f.value,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
