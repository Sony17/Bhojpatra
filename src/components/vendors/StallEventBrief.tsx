"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import EventBar from "@/components/booking/shared/EventBar";
import { useLang } from "@/lib/i18n";
import { useLocations, OTHER_LOCATION_ID } from "@/lib/locations";
import { useOccasions, occasionLeadFor, OTHER_OCCASION_ID } from "@/lib/occasions";
import {
  STALL_MIN_GUESTS,
  MAX_GUESTS,
  daysUntil,
  formatEventDate,
} from "@/lib/bookingPricing";
import { resolveNonVeg, type NonVegCount } from "@/lib/dietSplit";
import { patchStallDraft, readStallDraft } from "@/lib/stallDraft";

const DEFAULT_GUESTS = 100;

/**
 * The Single Stall event brief on the Brands page (/vendors?category=single-stall):
 * the same editable Occasion · Date · City · Guests · Serving time bar as
 * /book/stall. Every edit lands in the stall draft, so the booking a card opens
 * starts with it, and the cards' availability badges follow the date / meal.
 * City is the catalog's own city filter — one city on the page, not two.
 */
export function useStallEventBrief({
  city,
  setCity,
  allValue,
  enabled,
}: {
  /** The catalog's city filter: a location name, or `allValue` for any city. */
  city: string;
  setCity: (name: string) => void;
  allValue: string;
  enabled: boolean;
}): { date: string; mealTime: string; bar: ReactNode } {
  const { lang, t } = useLang();
  const occasionList = useOccasions({ singleStall: true });
  const locations = useLocations();

  const [occasionId, setOccasionId] = useState("");
  const [customOccasion, setCustomOccasion] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [mealTime, setMealTime] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [foodPreference, setFoodPreference] = useState("");
  const [nonVegMix, setNonVegMix] = useState<NonVegCount>(null);
  const [guests, setGuests] = useState(DEFAULT_GUESTS);
  const [hydrated, setHydrated] = useState(false);

  // The draft lives in sessionStorage — read after mount, once.
  useEffect(() => {
    const d = readStallDraft();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (d?.occasionId) setOccasionId(d.occasionId);
    if (d?.customOccasion) setCustomOccasion(d.customOccasion);
    if (d?.eventDate) setEventDate(d.eventDate);
    if (d?.mealTime) setMealTime(d.mealTime);
    if (d?.eventTime) setEventTime(d.eventTime);
    if (d?.foodPreference) setFoodPreference(d.foodPreference);
    if (typeof d?.nonVegMix === "number") setNonVegMix(d.nonVegMix);
    if (typeof d?.guests === "number" && d.guests > 0) setGuests(d.guests);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Write back only after the read, so an untouched page never overwrites it.
  useEffect(() => {
    if (!hydrated || !enabled) return;
    patchStallDraft({
      occasionId,
      customOccasion,
      eventDate,
      mealTime,
      eventTime,
      foodPreference,
      nonVegMix,
      guests,
    });
  }, [hydrated, enabled, occasionId, customOccasion, eventDate, mealTime, eventTime, foodPreference, nonVegMix, guests]);

  // City ↔ the catalog's filter (a name). A name outside the list is "Other".
  const known = locations.find((l) => l.name.toLowerCase() === city.toLowerCase());
  const anyCity = city === allValue;
  const cityId = known ? known.id : anyCity ? "" : OTHER_LOCATION_ID;
  const customCity = known || anyCity ? "" : city;

  const nonVegGuests = useMemo(
    () => resolveNonVeg(foodPreference, nonVegMix, guests),
    [foodPreference, nonVegMix, guests],
  );

  // Only the occasion's notice is known here — each stall's own notice is
  // checked on its card and again in the booking.
  const occasion = occasionList.find((o) => o.id === occasionId);
  const leadDays = occasionId === OTHER_OCCASION_ID || occasion ? occasionLeadFor(occasionId, occasionList) : 0;
  const daysToEvent = daysUntil(eventDate);
  const leadWarning =
    occasion && daysToEvent !== null && daysToEvent < leadDays
      ? t(
          `A ${occasion.name} needs ${leadDays} days' notice. Pick a later date.`,
          `${occasion.nameHi} के लिए ${leadDays} दिन का अग्रिम समय चाहिए। बाद की तारीख़ चुनें।`,
        )
      : "";

  const bar = enabled ? (
    <section className="mt-6" aria-label={t("Your event", "आपका आयोजन")}>
      <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-ink/60">
        {t("Your event", "आपका आयोजन")}
      </h2>
      <p className="mt-0.5 text-[12px] text-ink/55">
        {eventDate
          ? t(
              `Stalls above are checked for ${formatEventDate(eventDate)}. These details carry into your booking.`,
              `ऊपर के स्टॉल ${formatEventDate(eventDate)} के लिए जाँचे गए हैं। ये जानकारी आपकी बुकिंग में साथ जाएगी।`,
            )
          : t(
              "Add your date and serving time to see which stalls are free. These details carry into your booking.",
              "कौन-से स्टॉल खाली हैं, देखने के लिए तारीख़ और समय जोड़ें। ये जानकारी आपकी बुकिंग में साथ जाएगी।",
            )}
      </p>
      <EventBar
        lang={lang}
        t={t}
        occasionId={occasionId}
        setOccasionId={setOccasionId}
        customOccasion={customOccasion}
        setCustomOccasion={setCustomOccasion}
        occasionList={occasionList}
        eventDate={eventDate}
        setEventDate={setEventDate}
        mealTime={mealTime}
        setMealTime={setMealTime}
        eventTime={eventTime}
        setEventTime={setEventTime}
        foodPreference={foodPreference}
        setFoodPreference={setFoodPreference}
        nonVegGuests={nonVegGuests}
        setNonVegMix={setNonVegMix}
        cityId={cityId}
        setCityId={(id) => {
          const loc = locations.find((l) => l.id === id);
          if (loc) setCity(loc.name);
        }}
        customCity={customCity}
        setCustomCity={(name) => {
          if (name.trim()) setCity(name.trim());
        }}
        locations={locations}
        guests={guests}
        setGuests={setGuests}
        paxMin={STALL_MIN_GUESTS}
        paxMax={MAX_GUESTS}
        leadWarning={leadWarning}
        collapsible
        collapseAt="sm"
      />
    </section>
  ) : null;

  return { date: eventDate, mealTime, bar };
}
