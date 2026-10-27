import { requireRole } from "@/lib/auth";
import { findVendorByOwner, saveVendor } from "@/lib/vendorMenus";
import { readVendorAvailability } from "@/lib/vendorAvailabilityServer";
import { cleanBlockedDates, isIsoDate, todayIsoIST } from "@/lib/vendorAvailability";
import { cleanStallNotice } from "@/lib/stallNotice";
import type { LiveVendorRecord } from "@/lib/vendorMenus";

/** The vendor's Single Stall notice — `days: null` = never set (platform
 *  default applies). */
function noticeOf(v: LiveVendorRecord) {
  return { days: v.stallNoticeDays ?? null, cutoff: v.sameDayCutoff ?? null };
}

export const dynamic = "force-dynamic";

/**
 * GET /api/vendor/availability
 * The authenticated vendor's Single Stall calendar: their days off plus the
 * meal periods their orders already hold, and their booking notice.
 */
export async function GET() {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json({ error: "Vendor profile not found." }, { status: 404 });
    }
    return Response.json({
      ...(await readVendorAvailability(vendor)),
      notice: noticeOf(vendor),
    });
  } catch (err) {
    console.error("Failed to read vendor availability", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/vendor/availability
 *   { dates: string[], available: boolean } — switches the given days on or
 *     off for Single Stall orders. A day off stops new orders only — bookings
 *     already on that day stay with the vendor.
 *   { notice: { days, cutoff? } } — the Single Stall booking notice in days
 *     (0 = same day, open until `cutoff` IST).
 */
export async function POST(request: Request) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  let body: { dates?: unknown; available?: unknown; notice?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (body.notice !== undefined) {
    const n = (body.notice ?? {}) as { days?: unknown; cutoff?: unknown };
    const notice = cleanStallNotice(n.days, n.cutoff);
    if (!notice) {
      return Response.json({ error: "Pick a booking notice." }, { status: 400 });
    }
    try {
      const vendor = await findVendorByOwner(guard.id);
      if (!vendor) {
        return Response.json({ error: "Vendor profile not found." }, { status: 404 });
      }
      const next: LiveVendorRecord = {
        ...vendor,
        stallNoticeDays: notice.stallNoticeDays,
        sameDayCutoff: notice.sameDayCutoff,
        updatedAt: new Date().toISOString(),
      };
      await saveVendor(next);
      return Response.json({
        ...(await readVendorAvailability(next)),
        notice: noticeOf(next),
      });
    } catch (err) {
      console.error("Failed to update stall notice", err);
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
  }

  const today = todayIsoIST();
  const dates = Array.isArray(body.dates)
    ? body.dates.filter((d): d is string => isIsoDate(d) && d >= today)
    : [];
  if (!dates.length || typeof body.available !== "boolean") {
    return Response.json(
      { error: "Pick a date from today onward." },
      { status: 400 },
    );
  }

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json({ error: "Vendor profile not found." }, { status: 404 });
    }
    const current = new Set(cleanBlockedDates(vendor.blockedDates, today));
    for (const d of dates) {
      if (body.available) current.delete(d);
      else current.add(d);
    }
    const next = {
      ...vendor,
      blockedDates: cleanBlockedDates([...current], today),
      updatedAt: new Date().toISOString(),
    };
    await saveVendor(next);
    return Response.json({
      ...(await readVendorAvailability(next)),
      notice: noticeOf(next),
    });
  } catch (err) {
    console.error("Failed to update vendor availability", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
