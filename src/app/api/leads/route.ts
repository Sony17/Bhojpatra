import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import { sendLeadAlert } from "@/lib/email";

// Leads are captured at request time to Postgres (Neon) — never prerender or
// cache this handler.
export const dynamic = "force-dynamic";

export type LeadStatus = "New" | "Contacted";

export interface Lead {
  email: string;
  phone: string;
  source: string;
  createdAt: string;
  /** Follow-up state, flipped by the admin Lead Generation console. */
  status?: LeadStatus;
  /** What a support-callback request is about (chat "Request a callback"). */
  topic?: string;
  /** Optional free-text detail the customer added to a callback request. */
  note?: string;
}

/** Canonical help topics offered by the support-chat callback form. Anything
 *  else is ignored so the admin console stays tidy. */
const CALLBACK_TOPICS = [
  "Service assistance",
  "Daily orders",
  "Multi occasion order",
  "App guidance",
  "Rewards & referrals",
];

/** How a venue enquiry asked to be followed up — the three hand-offs offered
 *  on a venue page once the guest has entered their name and number. */
const VENUE_TOPICS = ["Chat", "Call", "Site visit"];

// De-duplicated by email (the id-field); a repeat sign-up updates in place.
const store = createStore<Lead>({
  table: "leads",
  idField: "email",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian mobile: 10 digits starting 6–9, ignoring spaces/dashes and an
// optional +91 / 0 prefix.
const PHONE_RE = /^[6-9]\d{9}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^(\+91|0091|91|0)/, "");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, phone, source, topic, note } = (body ?? {}) as Record<
    string,
    unknown
  >;

  const cleanEmail =
    typeof email === "string" && EMAIL_RE.test(email.trim())
      ? email.trim().toLowerCase()
      : "";
  const cleanedPhone =
    typeof phone === "string" ? normalizePhone(phone.trim()) : "";
  const validPhone = PHONE_RE.test(cleanedPhone);

  const ALLOWED_SOURCES = [
    "home-promo",
    "booking-intent",
    "home-booking-form",
    "support-callback",
    "venue-enquiry",
    // Feast-2027 waitlist — interest captured on the home page and /book
    // while full-catering Feast bookings aren't open yet (src/lib/launchFlags).
    "feast-2027-interest",
  ];
  const leadSource =
    typeof source === "string" && ALLOWED_SOURCES.includes(source)
      ? source
      : "home-promo";
  const isCallback = leadSource === "support-callback";
  const isVenue = leadSource === "venue-enquiry";
  const isFeast = leadSource === "feast-2027-interest";

  // A callback, venue enquiry or feast-waitlist signup is only actionable
  // with a number to ring back on.
  if ((isCallback || isVenue || isFeast) && !validPhone) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }
  // The promo signup sends both; the booking-intent capture sends phone only.
  // Require at least one valid contact.
  if (!cleanEmail && !validPhone) {
    return Response.json(
      { error: "Please enter a valid email address or mobile number." },
      { status: 400 },
    );
  }

  const allowedTopics = isVenue ? VENUE_TOPICS : CALLBACK_TOPICS;
  // A feast-waitlist lead always carries the fixed topic so the admin console
  // shows what the lead is about (the detail rides in `note`).
  const cleanTopic = isFeast
    ? "Feast 2027 waitlist"
    : typeof topic === "string" && allowedTopics.includes(topic.trim())
      ? topic.trim()
      : "";
  let cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : "";
  // A feast lead keys on a `feast:`+phone sentinel, so its real email (when
  // given) would otherwise be lost — keep it in the note for the admin console
  // and the alert email.
  if (isFeast && cleanEmail) {
    cleanNote = [cleanNote, `Email: ${cleanEmail}`]
      .filter(Boolean)
      .join(" · ")
      .slice(0, 500);
  }

  const lead: Lead = {
    // Leads are keyed by the `email` field. A callback keys on a `cb:` +phone
    // sentinel so it stays distinct from a promo/email lead for the same person
    // (one open callback per number, refreshed on re-request), while promo and
    // phone-only leads key on their email/phone as before.
    // A venue enquiry keys on `venue:`+phone for the same reason, so wanting a
    // visit to a venue never collides with (or gets swallowed by) an existing
    // promo lead for that number. A feast-waitlist signup keys on
    // `feast:`+phone likewise — one waitlist entry per number, refreshed on
    // re-submit, never swallowed by a promo lead.
    email: isCallback
      ? `cb:${cleanedPhone}`
      : isVenue
        ? `venue:${cleanedPhone}`
        : isFeast
          ? `feast:${cleanedPhone}`
          : cleanEmail || cleanedPhone,
    phone: validPhone ? cleanedPhone : "",
    source: leadSource,
    createdAt: new Date().toISOString(),
    ...(cleanTopic ? { topic: cleanTopic } : {}),
    ...(cleanNote ? { note: cleanNote } : {}),
  };

  try {
    if (isCallback || isVenue || isFeast) {
      // Always record (and alert on) a callback, venue enquiry or feast
      // signup — the team needs to reach out, and a re-request should refresh
      // the topic/note (a different venue, a new date, updated guest count)
      // rather than be dropped as a duplicate.
      await store.upsert(lead);
      await sendLeadAlert(lead);
    } else {
      const leads = await store.list();
      // Skip duplicates so a repeat sign-up stays idempotent (by email or phone).
      const exists = leads.some(
        (l) =>
          l.email === lead.email || (!!lead.phone && l.phone === lead.phone),
      );
      if (!exists) {
        await store.upsert(lead);
        // Alert the owners only on a genuinely new lead (best-effort).
        await sendLeadAlert(lead);
      }
    }
  } catch (err) {
    console.error("Failed to persist lead", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}

// Admin → Lead Generation reads the captured leads here. Newest first so the
// most recent promo sign-ups surface at the top of the table.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const leads = await store.list();
  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ leads });
}
