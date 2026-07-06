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
  ];
  const leadSource =
    typeof source === "string" && ALLOWED_SOURCES.includes(source)
      ? source
      : "home-promo";
  const isCallback = leadSource === "support-callback";

  // A callback request is only actionable with a number to ring back on.
  if (isCallback && !validPhone) {
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

  const cleanTopic =
    typeof topic === "string" && CALLBACK_TOPICS.includes(topic.trim())
      ? topic.trim()
      : "";
  const cleanNote =
    typeof note === "string" ? note.trim().slice(0, 500) : "";

  const lead: Lead = {
    // Leads are keyed by the `email` field. A callback keys on a `cb:` +phone
    // sentinel so it stays distinct from a promo/email lead for the same person
    // (one open callback per number, refreshed on re-request), while promo and
    // phone-only leads key on their email/phone as before.
    email: isCallback ? `cb:${cleanedPhone}` : cleanEmail || cleanedPhone,
    phone: validPhone ? cleanedPhone : "",
    source: leadSource,
    createdAt: new Date().toISOString(),
    ...(cleanTopic ? { topic: cleanTopic } : {}),
    ...(cleanNote ? { note: cleanNote } : {}),
  };

  try {
    if (isCallback) {
      // Always record (and alert on) a callback — the team needs to ring back,
      // and a re-request should refresh the topic/note rather than be dropped.
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
  const leads = await store.list();
  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ leads });
}
