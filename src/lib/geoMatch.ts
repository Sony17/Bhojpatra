/**
 * Pure helpers for mapping reverse-geocode results onto the admin-managed
 * serviceable city list. Safe to import from server routes and client.
 */

export type DetectedGeo = {
  cityName: string;
  state?: string;
  formattedAddress?: string;
};

export type LocationOption = { id: string; name: string; nameHi?: string };

export type MatchedLocation = {
  locationId: string;
  customCity?: string;
  cityName: string;
  state?: string;
  formattedAddress?: string;
};

/** Alternate spellings / names for seed cities — improves detection → id matching. */
const CITY_ALIASES: Record<string, string[]> = {
  lucknow: ["lucknow"],
  delhi: ["delhi", "new delhi", "delhi ncr", "ncr"],
  mumbai: ["mumbai", "bombay"],
  bengaluru: ["bengaluru", "bangalore", "bangalore urban"],
  kolkata: ["kolkata", "calcutta"],
  hyderabad: ["hyderabad"],
  jaipur: ["jaipur"],
  pune: ["pune", "poona"],
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesForLocation(loc: LocationOption): string[] {
  const base = [
    loc.name,
    loc.nameHi ?? "",
    loc.id.replace(/-/g, " "),
    ...(CITY_ALIASES[loc.id] ?? []),
  ];
  return base.map(normalize).filter(Boolean);
}

function matchesName(candidate: string, names: string[]): boolean {
  const norm = normalize(candidate);
  if (!norm) return false;
  return names.some(
    (n) => n === norm || n.includes(norm) || norm.includes(n),
  );
}

/**
 * Map a detected city/state onto a serviceable location id. Returns `other`
 * with a free-text city when the detected place isn't in the admin list.
 */
export function matchCityToLocation(
  detected: DetectedGeo,
  locations: LocationOption[],
): MatchedLocation | null {
  const cityName = detected.cityName?.trim();
  if (!cityName) return null;

  const candidates = [cityName, detected.state].filter(Boolean) as string[];

  for (const loc of locations) {
    const names = namesForLocation(loc);
    if (candidates.some((c) => matchesName(c, names))) {
      return {
        locationId: loc.id,
        cityName,
        state: detected.state,
        formattedAddress: detected.formattedAddress,
      };
    }
  }

  return {
    locationId: "other",
    customCity: cityName,
    cityName,
    state: detected.state,
    formattedAddress: detected.formattedAddress,
  };
}

/** Extract city + state from an OpenStreetMap Nominatim reverse-geocode row. */
export function parseNominatimResult(result: {
  display_name?: string;
  address?: Record<string, string | undefined>;
}): DetectedGeo | null {
  const addr = result.address ?? {};
  const cityName =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    addr.state_district ||
    "";

  if (!cityName.trim()) return null;

  return {
    cityName: cityName.trim(),
    state: addr.state,
    formattedAddress: result.display_name,
  };
}

/** Extract city + state from a Google Geocoding API result row (optional provider). */
export function parseGoogleGeocodeResult(result: {
  formatted_address?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
}): DetectedGeo | null {
  const components = result.address_components ?? [];
  const get = (...types: string[]) =>
    components.find((c) => types.some((t) => c.types.includes(t)))?.long_name;

  const cityName =
    get("locality") ||
    get("administrative_area_level_2") ||
    get("postal_town") ||
    get("sublocality", "sublocality_level_1") ||
    "";

  if (!cityName.trim()) return null;

  return {
    cityName: cityName.trim(),
    state: get("administrative_area_level_1"),
    formattedAddress: result.formatted_address,
  };
}
