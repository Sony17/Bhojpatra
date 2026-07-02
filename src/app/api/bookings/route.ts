import { promises as fs } from "fs";
import path from "path";
import {
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import type { BookingStatus } from "@/lib/data";
import type { EmiPlan } from "@/lib/emi";

// Orders are written at confirm time and appended to a JSON store on disk so
// they show up in the admin booking console — never prerender or cache this.
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

const STORE = path.join(process.cwd(), "data", "bookings.json");

async function readOrders(): Promise<StoredOrder[]> {
  try {
    return JSON.parse(await fs.readFile(STORE, "utf8")) as StoredOrder[];
  } catch {
    // No store yet (or unreadable) — start fresh.
    return [];
  }
}

// List recorded orders, newest first (used by the admin booking console).
export async function GET() {
  const orders = await readOrders();
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

  const orders = await readOrders();

  // Idempotent on the booking id so a repeat confirm (double-tap, retry after a
  // network blip) updates the existing record rather than duplicating it.
  const idx = orders.findIndex((o) => o.id === order.id);
  try {
    if (idx >= 0) orders[idx] = { ...orders[idx], ...order };
    else orders.push(order);
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    await fs.writeFile(STORE, JSON.stringify(orders, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist order", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, order }, { status: idx >= 0 ? 200 : 201 });
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
