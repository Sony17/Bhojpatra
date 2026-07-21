/**
 * Customer support-ticket store.
 *
 * Tickets are raised from the customer's My Bookings ("Get help" on an order)
 * and worked in the admin Support view (Open → In Progress → Resolved). Same
 * `createStore` idiom as the other stores; the admin UI reads these back via
 * GET /api/support.
 */
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type { SupportPriority, SupportTicketStatus } from "@/lib/admin/types";

export interface SupportTicketRecord {
  id: string;
  subject: string;
  /** Customer display name, taken from the signed-in session. */
  customer: string;
  email: string;
  category: string;
  priority: SupportPriority;
  status: SupportTicketStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  bookingId?: string;
  message: string;
}

/** Canonical ticket categories offered by the customer "Get help" form. The
 *  client sends the English label verbatim (its Hindi label is display-only),
 *  so anything outside this list is rejected server-side. */
export const TICKET_CATEGORIES = [
  "Booking",
  "Payment",
  "Refund",
  "Vendor",
  "Billing",
  "Technical",
  "General",
] as const;

/** Triage default — money problems are urgent, event-critical ones medium,
 *  the rest low. Admins can re-triage later if the flow ever grows an editor. */
export function priorityForCategory(category: string): SupportPriority {
  if (category === "Payment" || category === "Refund") return "High";
  if (category === "Vendor" || category === "Booking") return "Medium";
  return "Low";
}

const store = createStore<SupportTicketRecord>({
  table: "support_tickets",
  idField: "id",
});

export function readTickets(): Promise<SupportTicketRecord[]> {
  return store.list();
}

export function getTicket(id: string): Promise<SupportTicketRecord | null> {
  return store.get(id);
}

export function saveTicket(rec: SupportTicketRecord): Promise<void> {
  return store.upsert(rec);
}

export function newTicketId(): string {
  return `TCK-${randomUUID().slice(0, 6).toUpperCase()}`;
}
