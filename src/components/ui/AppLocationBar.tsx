"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/i18n";
import { OTHER_LOCATION_ID, useLocations } from "@/lib/locations";
import {
  LOCATION_CHANGED_EVENT,
  markManualLocation,
  readStoredLocation,
  resolveLocationDisplayName,
  useDetectedLocation,
  type StoredLocation,
} from "@/lib/detectedLocation";
import Drawer from "./Drawer";
import { cn } from "./cn";

/**
 * Location control. Opens a city picker sheet so the visitor can change
 * location anytime — not a one-way auto-detect.
 */
export default function AppLocationBar({
  className,
  compact = false,
  /** Light-on-dark labels when the bar sits over a darkened hero. */
  onDark = false,
}: {
  className?: string;
  compact?: boolean;
  onDark?: boolean;
}) {
  const { t, lang } = useLang();
  const locations = useLocations();
  const { status, match, detect } = useDetectedLocation(locations);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [query, setQuery] = useState("");
  const [otherCity, setOtherCity] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  function syncFromStore(stored?: StoredLocation | null) {
    const entry = stored ?? readStoredLocation();
    if (entry) {
      setSelectedId(entry.cityId);
      if (entry.cityId === OTHER_LOCATION_ID) {
        setOtherCity(entry.customCity ?? "");
        setLabel(entry.customCity?.trim() || t("Other", "अन्य"));
        return;
      }
      const name = resolveLocationDisplayName(
        entry.cityId,
        locations,
        entry.customCity,
      );
      if (name) {
        setLabel(name);
        return;
      }
    }
    if (match) {
      setSelectedId(match.locationId);
      setLabel(match.customCity || match.cityName || "");
    }
  }

  useEffect(() => {
    syncFromStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when list / match lands
  }, [locations, match]);

  useEffect(() => {
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<StoredLocation>).detail;
      syncFromStore(detail);
    }
    window.addEventListener(LOCATION_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(LOCATION_CHANGED_EVENT, onChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  const display = useMemo(() => {
    if (label) return label;
    if (status === "detecting") return t("Detecting…", "पता लगा रहे हैं…");
    return t("Select city", "शहर चुनें");
  }, [label, status, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nameHi.toLowerCase().includes(q),
    );
  }, [locations, query]);

  function pickCity(id: string, custom?: string) {
    markManualLocation(id, custom);
    if (id === OTHER_LOCATION_ID) {
      const name = custom?.trim() || t("Other", "अन्य");
      setLabel(name);
      setSelectedId(OTHER_LOCATION_ID);
      setOtherCity(custom?.trim() ?? "");
    } else {
      const loc = locations.find((l) => l.id === id);
      setLabel(loc ? (lang === "hi" ? loc.nameHi : loc.name) : id);
      setSelectedId(id);
      setOtherCity("");
    }
    setQuery("");
    setOpen(false);
  }

  async function useMyLocation() {
    const result = await detect();
    if (result) {
      setSelectedId(result.locationId);
      setLabel(result.customCity || result.cityName || "");
      setOtherCity(result.customCity ?? "");
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "focus-ring group flex min-w-0 items-center gap-2 text-left touch-manipulation active:scale-[0.99]",
          className,
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t(`Change location: ${display}`, `लोकेशन बदलें: ${display}`)}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            onDark
              ? "bg-white/15 text-cream ring-1 ring-white/25"
              : "bg-cream text-maroon",
            compact ? "h-8 w-8" : "h-9 w-9",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-1">
          <span
            className={cn(
              "truncate text-sm font-bold",
              onDark
                ? "text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]"
                : "text-ink",
            )}
          >
            {display}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 12 12"
            className={cn(
              "h-3 w-3 shrink-0 transition-transform duration-200 group-hover:translate-y-px",
              onDark ? "text-cream" : "text-maroon",
            )}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M3 4.5 6 7.5 9 4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={t("Choose your city", "अपना शहर चुनें")}
      >
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => void useMyLocation()}
            disabled={status === "detecting"}
            className="focus-ring flex w-full items-center gap-3 rounded-xl border border-maroon/15 bg-cream/50 px-3.5 py-3 text-left transition-colors hover:border-maroon/35 disabled:opacity-60"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon text-cream">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-maroon">
                {status === "detecting"
                  ? t("Detecting…", "पता लगा रहे हैं…")
                  : t("Use my current location", "मेरी मौजूदा लोकेशन इस्तेमाल करें")}
              </span>
              <span className="mt-0.5 block text-[12px] text-ink/55">
                {t(
                  "Update with GPS for better matches nearby.",
                  "पास के बेहतर मैच के लिए GPS से अपडेट करें।",
                )}
              </span>
            </span>
          </button>

          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search city…", "शहर खोजें…")}
              aria-label={t("Search city", "शहर खोजें")}
              className="w-full rounded-xl border border-maroon/12 bg-cream/35 py-2.5 pl-10 pr-3 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-maroon/35 focus:bg-white"
            />
          </div>

          <ul className="divide-y divide-maroon/8 overflow-hidden rounded-xl border border-maroon/10">
            {filtered.map((loc) => {
              const name = lang === "hi" ? loc.nameHi : loc.name;
              const active = selectedId === loc.id;
              return (
                <li key={loc.id}>
                  <button
                    type="button"
                    onClick={() => pickCity(loc.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm transition-colors",
                      active
                        ? "bg-cream font-bold text-maroon"
                        : "bg-white font-medium text-ink hover:bg-cream/40",
                    )}
                  >
                    <span>{name}</span>
                    {active && (
                      <span aria-hidden className="text-maroon">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-ink/50">
                {t("No cities match that search.", "उस खोज से कोई शहर नहीं मिला।")}
              </li>
            )}
          </ul>

          <div className="rounded-xl border border-maroon/10 bg-white p-3.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">
              {t("Other city", "अन्य शहर")}
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={otherCity}
                onChange={(e) => setOtherCity(e.target.value)}
                placeholder={t("Type your city or state", "अपना शहर या राज्य लिखें")}
                aria-label={t("Type your city or state", "अपना शहर या राज्य लिखें")}
                className="min-w-0 flex-1 rounded-lg border border-maroon/12 bg-cream/30 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink/40 focus:border-maroon/35 focus:bg-white"
              />
              <button
                type="button"
                disabled={!otherCity.trim()}
                onClick={() =>
                  pickCity(OTHER_LOCATION_ID, otherCity.trim())
                }
                className="shrink-0 rounded-lg bg-maroon px-3.5 py-2.5 text-sm font-bold text-cream disabled:opacity-40"
              >
                {t("Set", "सेट")}
              </button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
}
