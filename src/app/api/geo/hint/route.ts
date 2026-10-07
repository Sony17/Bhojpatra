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
 *
 * "No hint" is a normal outcome (always the case locally, and for any visitor
 * whose IP city doesn't match a served location), so it answers 204 rather than
 * a 404 the browser would log as a failed request on every page load.
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

  if (!cityName) return new Response(null, { status: 204 });

  const locations = await readLocations();
  const matched = matchCityToLocation({ cityName, state }, locations);
  if (!matched) return new Response(null, { status: 204 });

  const response: MatchedLocation & { source: "ip" } = {
    ...matched,
    source: "ip",
  };

  return Response.json(response);
}
