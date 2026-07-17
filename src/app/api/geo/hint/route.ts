import { cities } from "@/lib/data";
import { matchCityToLocation, type MatchedLocation } from "@/lib/geoMatch";
import { readSingleton } from "@/lib/store";

export const dynamic = "force-dynamic";

type LocationOption = { id: string; name: string; nameHi: string };

async function readLocations(): Promise<LocationOption[]> {
  const stored = await readSingleton<{ locations: LocationOption[] }>(
    "locations",
  );
  const list = stored?.locations;
  return Array.isArray(list) && list.length ? list : cities;
}

/**
 * GET /api/geo/hint
 *
 * Best-effort city guess from the visitor's IP — no browser permission needed.
 * On Vercel this uses the built-in geo headers; no API key required.
 */
export async function GET(request: Request) {
  const cityName =
    request.headers.get("x-vercel-ip-city")?.trim() ||
    request.headers.get("cf-ipcity")?.trim() ||
    "";
  const state =
    request.headers.get("x-vercel-ip-country-region")?.trim() ||
    request.headers.get("cf-region")?.trim() ||
    undefined;

  if (!cityName) {
    return Response.json(
      { error: "No IP-based location hint available." },
      { status: 404 },
    );
  }

  const locations = await readLocations();
  const matched = matchCityToLocation({ cityName, state }, locations);
  if (!matched) {
    return Response.json(
      { error: "Could not match IP location hint." },
      { status: 404 },
    );
  }

  const response: MatchedLocation & { source: "ip" } = {
    ...matched,
    source: "ip",
  };

  return Response.json(response);
}
