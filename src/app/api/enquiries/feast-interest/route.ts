import {
  addEnquiry,
  newEnquiryId,
  type EnquiryRecord,
} from "@/lib/enquiries";
import { FEAST_PACKAGE_INTEREST_SOURCE } from "@/lib/launchFlags";
import { sendEnquiryAlert } from "@/lib/email";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validate";

export const dynamic = "force-dynamic";

const PACKAGE_IDS = new Set(["silver", "gold", "platinum"]);

/**
 * POST /api/enquiries/feast-interest — Feast tier "Register interest" popup.
 * Persists to the enquiries store (Admin → Enquiries); email is optional.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const packageId =
    typeof body.packageId === "string" ? body.packageId.trim() : "";
  const packageName =
    typeof body.packageName === "string" ? body.packageName.trim() : packageId;
  const occasion = typeof body.occasion === "string" ? body.occasion.trim() : "";
  const eventDate =
    typeof body.eventDate === "string" ? body.eventDate.trim() : "";
  const guestsRaw =
    typeof body.guests === "string" || typeof body.guests === "number"
      ? String(body.guests).trim()
      : "";
  const venue = typeof body.venue === "string" ? body.venue.trim() : "";
  const guests = guestsRaw ? Number(guestsRaw) : NaN;

  if (!name) {
    return Response.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidPhone(rawPhone)) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }
  if (rawEmail && !isValidEmail(rawEmail)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!city) {
    return Response.json({ error: "Please tell us your city." }, { status: 400 });
  }
  if (!PACKAGE_IDS.has(packageId)) {
    return Response.json(
      { error: "Please choose a feast package." },
      { status: 400 },
    );
  }
  if (!occasion) {
    return Response.json({ error: "Please tell us the occasion." }, { status: 400 });
  }
  if (!eventDate) {
    return Response.json(
      { error: "Please pick an event date." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(guests) || guests < 1) {
    return Response.json(
      { error: "Please tell us the guest count." },
      { status: 400 },
    );
  }

  const messageParts = [
    `City: ${city}`,
    `Package: ${packageName} (${packageId})`,
    `Occasion: ${occasion}`,
    `Event date: ${eventDate}`,
    `Guests: ${guests}`,
    venue ? `Venue: ${venue}` : "",
  ].filter(Boolean);

  const record: EnquiryRecord = {
    id: newEnquiryId(),
    name,
    email: rawEmail ? rawEmail.toLowerCase() : "",
    phone: normalizePhone(rawPhone),
    subject: `Feast package — ${packageName}`,
    message: messageParts.join(" · "),
    source: FEAST_PACKAGE_INTEREST_SOURCE,
    createdAt: new Date().toISOString(),
    packageId,
    packageName,
    city,
    occasion,
    eventDate,
    guests,
    ...(venue ? { venue } : {}),
  };

  try {
    await addEnquiry(record);
    await sendEnquiryAlert(record);
  } catch (err) {
    console.error("Failed to persist feast package interest", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
