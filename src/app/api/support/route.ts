import {
  getTicket,
  newTicketId,
  priorityForCategory,
  readTickets,
  saveTicket,
  TICKET_CATEGORIES,
  type SupportTicketRecord,
} from "@/lib/supportTickets";
import type { SupportTicketStatus } from "@/lib/admin/types";
import { createStore } from "@/lib/store";
import { sendSupportTicketAlert } from "@/lib/email";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Minimal projection of a stored booking — just enough to check that the
 *  ticket's `bookingId` really belongs to the caller (see StoredOrder for the
 *  full shape; legacy orders may lack `userId` and carry only `email`). */
const bookings = createStore<{ id: string; userId?: string; email?: string }>({
  table: "bookings",
  idField: "id",
});

// POST /api/support → raise a support ticket ("Get help" in My Bookings).
// Any signed-in account may file one; identity comes from the session, never
// the client, so a ticket can't be raised on someone else's behalf.
export async function POST(request: Request) {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const user = guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!subject) {
    return Response.json(
      { error: "Please add a short subject." },
      { status: 400 },
    );
  }
  if (!(TICKET_CATEGORIES as readonly string[]).includes(category)) {
    return Response.json(
      { error: "Please pick what this is about." },
      { status: 400 },
    );
  }
  if (!message) {
    return Response.json(
      { error: "Please describe the issue." },
      { status: 400 },
    );
  }

  // A ticket may reference one of the caller's own bookings; anything else
  // (missing, or another customer's order) is rejected outright.
  let bookingId: string | undefined;
  if (typeof body.bookingId === "string" && body.bookingId.trim()) {
    const id = body.bookingId.trim();
    const order = await bookings.get(id);
    const mine =
      order &&
      (order.userId
        ? order.userId === user.id
        : order.email?.toLowerCase() === user.email.toLowerCase());
    if (!mine) {
      return Response.json({ error: "Booking not found." }, { status: 404 });
    }
    bookingId = id;
  }

  const now = new Date().toISOString();
  const record: SupportTicketRecord = {
    id: newTicketId(),
    subject,
    customer: user.name?.trim() || user.email,
    email: user.email,
    category,
    priority: priorityForCategory(category),
    status: "Open",
    createdAt: now,
    updatedAt: now,
    ...(bookingId ? { bookingId } : {}),
    message,
  };

  try {
    await saveTicket(record);
    // Alert the owners so a new ticket is actioned promptly (best-effort).
    await sendSupportTicketAlert(record);
  } catch (err) {
    console.error("Failed to persist support ticket", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, ticket: record }, { status: 201 });
}

// GET /api/support → list tickets (newest first) for the admin.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const tickets = await readTickets();
  tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ tickets });
}

const STATUSES: readonly SupportTicketStatus[] = [
  "Open",
  "In Progress",
  "Resolved",
];

// PATCH /api/support → advance a ticket's lifecycle status (admin).
export async function PATCH(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status = body.status as SupportTicketStatus;
  if (!id || !STATUSES.includes(status)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const ticket = await getTicket(id);
  if (!ticket) {
    return Response.json({ error: "Ticket not found." }, { status: 404 });
  }

  const updated: SupportTicketRecord = {
    ...ticket,
    status,
    updatedAt: new Date().toISOString(),
  };
  await saveTicket(updated);
  return Response.json({ ok: true, ticket: updated });
}
