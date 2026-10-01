"use client";

import { useState, type KeyboardEvent } from "react";
import { cities as canonicalCities } from "@/lib/data";

interface ServiceCitiesChipInputProps {
  value: string[];
  onChange: (cities: string[]) => void;
  homeCity?: string;
  disabled?: boolean;
}

const POPULAR_SUGGESTIONS = [
  ...canonicalCities.map((c) => c.name),
  "Kanpur",
  "Varanasi",
  "Ayodhya",
  "Prayagraj",
  "Noida",
  "Gurugram",
];

export default function ServiceCitiesChipInput({
  value,
  onChange,
  homeCity,
  disabled = false,
}: ServiceCitiesChipInputProps) {
  const [inputVal, setInputVal] = useState("");

  const addCity = (cityName: string) => {
    const trimmed = cityName.trim();
    if (!trimmed) return;
    // Normalize casing for display (Title Case)
    const normalized = trimmed
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");

    if (value.some((c) => c.toLowerCase() === normalized.toLowerCase())) {
      setInputVal("");
      return;
    }

    onChange([...value, normalized]);
    setInputVal("");
  };

  const removeCity = (indexToRemove: number) => {
    onChange(value.filter((_, i) => i !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCity(inputVal);
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      removeCity(value.length - 1);
    }
  };

  // Filter suggestions to those not yet selected
  const availableSuggestions = POPULAR_SUGGESTIONS.filter(
    (s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()),
  ).slice(0, 8);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-ink">
          Service Coverage Cities
        </label>
        <span className="text-xs text-ink-soft">
          {value.length === 0
            ? "No cities added yet"
            : `${value.length} ${value.length === 1 ? "city" : "cities"} covered`}
        </span>
      </div>

      {/* Input container with chips inside */}
      <div
        className={`flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-control border border-cream-3 bg-cream/40 p-2 transition-colors focus-within:border-maroon focus-within:ring-1 focus-within:ring-maroon/30 ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
      >
        {value.map((city, idx) => {
          const isHome =
            homeCity && city.toLowerCase() === homeCity.toLowerCase();
          return (
            <span
              key={city + idx}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                isHome
                  ? "bg-maroon/10 text-maroon border border-maroon/30"
                  : "bg-white text-ink border border-cream-3 shadow-xs"
              }`}
            >
              <span>{city}</span>
              {isHome && (
                <span className="text-[10px] text-maroon font-semibold uppercase tracking-wider">
                  (Home)
                </span>
              )}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeCity(idx)}
                  className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-ink-soft hover:bg-cream-3 hover:text-ink"
                  aria-label={`Remove ${city}`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}

        <input
          type="text"
          disabled={disabled}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => inputVal.trim() && addCity(inputVal)}
          placeholder={
            value.length === 0
              ? "Type city and press Enter (e.g. Lucknow, Kanpur)..."
              : "Add another city..."
          }
          className="min-w-[160px] flex-1 bg-transparent px-1 py-0.5 text-sm text-ink placeholder:text-ink-soft/60 outline-none"
        />
      </div>

      {/* Quick suggestions */}
      {!disabled && availableSuggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-ink-soft/80">Suggested:</span>
          {availableSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addCity(s)}
              className="rounded-full bg-cream-2/80 px-2 py-0.5 text-ink-soft transition-colors hover:bg-maroon/10 hover:text-maroon"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
