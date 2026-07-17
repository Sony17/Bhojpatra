import { cities } from "@/lib/data";
import {
  matchCityToLocation,
  parseGoogleGeocodeResult,
  parseNominatimResult,
  type DetectedGeo,
  type MatchedLocation,
} from "@/lib/geoMatch";
import { readSingleton } from "@/lib/store";

export const dynamic = "force-dynamic";

type LocationOption = { id: string; name: string; nameHi: string };

const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT?.trim() ||
  "Bhojpatra/1.0 (https://bhojpatra.com; location detection)";

async function readLocations(): Promise<LocationOption[]> {
  const stored = await readSingleton<{ locations: LocationOption[] }>(
    "locations",
  );
  const list = stored?.locations;
  return Array.isArray(list) && list.length ? list : cities;
}

type GoogleGeocodeResponse = {
  status: string;
  results?: Array<{
    formatted_address?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  error_message?: string;
};

type NominatimResponse = {
  display_name?: string;
  address?: Record<string, string | undefined>;
  error?: string;
};

async function reverseWithNominatim(
  lat: number,
  lng: number,
): Promise<DetectedGeo | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "en");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": NOMINATIM_UA },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;

  const payload = (await res.json()) as NominatimResponse;
  if (payload.error) return null;
  return parseNominatimResult(payload);
}

async function reverseWithGoogle(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<DetectedGeo | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${lat},${lng}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("language", "en");
  url.searchParams.set("result_type", "locality|administrative_area_level_2");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const payload = (await res.json()) as GoogleGeocodeResponse;
  if (payload.status !== "OK" || !payload.results?.length) return null;

  for (const result of payload.results) {
    const detected = parseGoogleGeocodeResult(result);
    if (detected) return detected;
  }
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<DetectedGeo | null> {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (googleKey) {
    try {
      const detected = await reverseWithGoogle(lat, lng, googleKey);
      if (detected) return detected;
    } catch (err) {
      console.warn("Google reverse geocode failed, falling back to Nominatim", err);
    }
  }

  try {
    return await reverseWithNominatim(lat, lng);
  } catch (err) {
    console.error("Nominatim reverse geocode failed", err);
    return null;
  }
}

/**
 * POST /api/geo/reverse
 * Body: { lat: number, lng: number }
 *
 * Reverse-geocodes coordinates (OpenStreetMap Nominatim by default; Google if
 * GOOGLE_MAPS_API_KEY is set) and maps the result onto the serviceable city list.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const lat = Number((body as { lat?: unknown })?.lat);
  const lng = Number((body as { lng?: unknown })?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json(
      { error: "Provide valid lat and lng numbers." },
      { status: 400 },
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return Response.json({ error: "Coordinates out of range." }, { status: 400 });
  }

  const detected = await reverseGeocode(lat, lng);
  if (!detected) {
    return Response.json(
      { error: "Could not determine your city from coordinates." },
      { status: 404 },
    );
  }

  const locations = await readLocations();
  const matched = matchCityToLocation(detected, locations);
  if (!matched) {
    return Response.json(
      { error: "Could not match detected city." },
      { status: 404 },
    );
  }

  const response: MatchedLocation & { lat: number; lng: number } = {
    ...matched,
    lat,
    lng,
  };

  return Response.json(response);
}
