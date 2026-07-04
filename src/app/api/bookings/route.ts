import path from "path";
import {
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import type { BookingStatus } from "@/lib/data";
import type { EmiPlan } from "@/lib/emi";
import { createStore } from "@/lib/store";

// Orders are written at confirm time to Postgres (Neon) so they show up in the
// admin booking console — never prerender or cache this.
export const dynamic = "force-dynamic";

export interface StoredOrder {
  id: string;
  customer: string;
  phone: string;
  occasion: string;
  date: string;
  guests: number;
  vendor: string;
  city: string;
  amount: number;
  paid: number;
  paymentMethod: OrderPaymentMethod;
  /** Transaction / reference ID of the online payment (UPI/QR), when money was
   *  settled at booking time. Absent for COD / "connect". */
  paymentRef?: string;
  /** Instalment schedule for the balance, when the guest chose an EMI plan. */
  emiPlan?: EmiPlan;
  status: BookingStatus;
  createdAt: string;
  /** Referral attribution — set when the feast was booked via a partner. */
  referralCode?: string;
  referrerName?: string;
  referrerType?: string;
}

const store = createStore<StoredOrder>({
  table: "bookings",
  file: path.join(process.cwd(), "data", "bookings.json"),
  idField: "id",
});

// List recorded orders, newest first (used by the admin booking console).
export async function GET() {
  const orders = await store.list();
  return Response.json({ orders: orders.slice().reverse() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    id,
    customer,
    phone,
    occasion,
    date,
    guests,
    vendor,
    city,
    amount,
    paid,
    paymentMethod,
    paymentRef,
    emiPlan,
    status,
    referralCode,
    referrerName,
    referrerType,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof id !== "string" || !/^BHJ-/.test(id)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const amt = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  if (!isOrderPaymentMethod(paymentMethod)) {
    return Response.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const paidAmt = typeof paid === "number" ? paid : Number(paid);

  const order: StoredOrder = {
    id,
    customer:
      typeof customer === "string" && customer.trim()
        ? customer.trim()
        : "Online Booking",
    phone: typeof phone === "string" ? phone.trim() : "",
    occasion: typeof occasion === "string" ? occasion : "Feast",
    date: typeof date === "string" ? date : "",
    guests: Number.isFinite(Number(guests)) ? Math.round(Number(guests)) : 0,
    vendor: typeof vendor === "string" ? vendor : "Bhojpatra",
    city: typeof city === "string" ? city : "—",
    amount: Math.round(amt),
    paid: Number.isFinite(paidAmt) && paidAmt > 0 ? Math.round(paidAmt) : 0,
    paymentMethod,
    ...(typeof paymentRef === "string" && paymentRef.trim()
      ? { paymentRef: paymentRef.trim() }
      : {}),
    ...(isEmiPlan(emiPlan) ? { emiPlan } : {}),
    status: isBookingStatus(status) ? status : "Confirmed",
    createdAt: new Date().toISOString(),
    ...(typeof referralCode === "string" && referralCode.trim()
      ? {
          referralCode: referralCode.trim(),
          referrerName:
            typeof referrerName === "string" && referrerName.trim()
              ? referrerName.trim()
              : undefined,
          referrerType:
            typeof referrerType === "string" ? referrerType : undefined,
        }
      : {}),
  };

  // Idempotent on the booking id so a repeat confirm (double-tap, retry after a
  // network blip) updates the existing record rather than duplicating it.
  const existing = await store.get(order.id);
  const merged = existing ? { ...existing, ...order } : order;
  try {
    await store.upsert(merged);
  } catch (err) {
    console.error("Failed to persist order", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, order: merged }, { status: existing ? 200 : 201 });
}

function isBookingStatus(v: unknown): v is BookingStatus {
  return (
    v === "Pending" ||
    v === "Confirmed" ||
    v === "Completed" ||
    v === "Cancelled"
  );
}

/** Shallow shape-check for an EMI plan posted from the booking wizard. */
function isEmiPlan(v: unknown): v is EmiPlan {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.count === "number" &&
    typeof p.balance === "number" &&
    Array.isArray(p.installments)
  );
}
