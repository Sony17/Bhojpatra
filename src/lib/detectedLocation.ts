"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchedLocation } from "@/lib/geoMatch";
import type { LocationOption } from "@/lib/locations";

export type DetectionStatus =
  | "idle"
  | "detecting"
  | "detected"
  | "failed"
  | "denied"
  | "unsupported";

export type StoredLocation = {
  cityId: string;
  customCity?: string;
  cityName?: string;
  state?: string;
  detectedAt: number;
  source: "detected" | "manual";
};

const STORAGE_KEY = "bhojpatra:location";
const MANUAL_KEY = "bhojpatra:location-manual";

/** Fired on `window` whenever the visitor's city is saved (manual or detected). */
export const LOCATION_CHANGED_EVENT = "bhojpatra:location-changed";

function emitLocationChanged(entry: StoredLocation): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LOCATION_CHANGED_EVENT, { detail: entry }),
  );
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readStoredLocation(): StoredLocation | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    if (!parsed?.cityId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistDetectedLocation(match: MatchedLocation): void {
  if (!canUseStorage()) return;
  const entry: StoredLocation = {
    cityId: match.locationId,
    customCity: match.customCity,
    cityName: match.cityName,
    state: match.state,
    detectedAt: Date.now(),
    source: "detected",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  localStorage.removeItem(MANUAL_KEY);
  emitLocationChanged(entry);
}

export function markManualLocation(cityId: string, customCity?: string): void {
  if (!canUseStorage()) return;
  localStorage.setItem(MANUAL_KEY, "1");
  const entry: StoredLocation = {
    cityId,
    customCity: customCity?.trim() || undefined,
    detectedAt: Date.now(),
    source: "manual",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  emitLocationChanged(entry);
}

export function isManualLocation(): boolean {
  if (!canUseStorage()) return false;
  return localStorage.getItem(MANUAL_KEY) === "1";
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 12_000,
      maximumAge: 300_000,
    });
  });
}

async function fetchIpHint(): Promise<MatchedLocation | null> {
  try {
    const res = await fetch("/api/geo/hint");
    if (!res.ok) return null;
    return (await res.json()) as MatchedLocation;
  } catch {
    return null;
  }
}

async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<MatchedLocation> {
  const res = await fetch("/api/geo/reverse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lat, lng }),
  });
  const data = (await res.json()) as MatchedLocation & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Reverse geocode failed");
  }
  return data;
}

/**
 * Detect the visitor's city via IP hint and/or browser geolocation, then map
 * it onto the admin-managed location list. No Google API key is required.
 */
export function useDetectedLocation(
  locations: LocationOption[],
  { autoDetect = true }: { autoDetect?: boolean } = {},
) {
  const [status, setStatus] = useState<DetectionStatus>("idle");
  const [match, setMatch] = useState<MatchedLocation | null>(null);
  const ranAuto = useRef(false);

  const detect = useCallback(async () => {
    setStatus("detecting");
    // Explicit "use my location" clears a prior manual pick so GPS can apply —
    // but if the visitor picks a city again while this request is in flight,
    // that later manual pick wins (checked below).
    if (canUseStorage()) localStorage.removeItem(MANUAL_KEY);
    try {
      const pos = await getCurrentPosition();
      const result = await reverseGeocode(
        pos.coords.latitude,
        pos.coords.longitude,
      );
      if (isManualLocation()) {
        setStatus("detected");
        return null;
      }
      persistDetectedLocation(result);
      setMatch(result);
      setStatus("detected");
      return result;
    } catch (err) {
      const geoErr = err as GeolocationPositionError & { message?: string };
      if (isManualLocation()) {
        setStatus("detected");
        return null;
      }
      if (geoErr?.code === 1) {
        setStatus("denied");
      } else if (geoErr?.message === "unsupported") {
        setStatus("unsupported");
      } else {
        setStatus("failed");
      }
      return null;
    }
  }, []);

  const detectWithFallback = useCallback(async () => {
    setStatus("detecting");

    const ipHint = await fetchIpHint();
    if (ipHint) {
      if (isManualLocation()) {
        setStatus("detected");
        return null;
      }
      persistDetectedLocation(ipHint);
      setMatch(ipHint);
      setStatus("detected");
      return ipHint;
    }

    return detect();
  }, [detect]);

  // Silent, permission-free pre-fill from the visitor's IP. Used on first load
  // so the page never pops a geolocation prompt uninvited — the precise browser
  // lookup only runs when the visitor clicks to detect.
  const detectFromIp = useCallback(async () => {
    setStatus("detecting");
    const ipHint = await fetchIpHint();
    if (!ipHint) {
      setStatus("idle");
      return null;
    }
    if (isManualLocation()) {
      setStatus("detected");
      return null;
    }
    persistDetectedLocation(ipHint);
    setMatch(ipHint);
    setStatus("detected");
    return ipHint;
  }, []);

  useEffect(() => {
    if (!autoDetect || ranAuto.current || locations.length === 0) return;
    ranAuto.current = true;

    if (isManualLocation()) {
      const stored = readStoredLocation();
      if (stored) {
        setMatch({
          locationId: stored.cityId,
          customCity: stored.customCity,
          cityName: stored.cityName ?? stored.customCity ?? "",
          state: stored.state,
        });
        setStatus("detected");
      }
      return;
    }

    const stored = readStoredLocation();
    const fresh =
      stored?.source === "detected" &&
      Date.now() - stored.detectedAt < 24 * 60 * 60 * 1000;

    if (fresh && stored) {
      setMatch({
        locationId: stored.cityId,
        customCity: stored.customCity,
        cityName: stored.cityName ?? stored.customCity ?? "",
        state: stored.state,
      });
      setStatus("detected");
      return;
    }

    void detectFromIp();
  }, [autoDetect, detectFromIp, locations.length]);

  return { status, match, detect, detectWithFallback };
}

/** Resolve a stored/detected location id to the display name used by vendors. */
export function resolveLocationDisplayName(
  cityId: string,
  locations: LocationOption[],
  customCity?: string,
): string | null {
  if (cityId === "other") return customCity?.trim() || null;
  const found = locations.find((l) => l.id === cityId);
  return found?.name ?? null;
}
