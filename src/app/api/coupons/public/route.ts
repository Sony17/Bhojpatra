import { readCouponTerms } from "@/lib/stallOrderPricing";
import { couponUsable, istTodayISO } from "@/lib/bookingRules";

export const dynamic = "force-dynamic";

// GET /api/coupons/public → { coupons } — the codes a customer can apply right
// now (Active and inside their validity window), from the admin Coupon
// Manager. Only the customer-facing fields go out. Occasion / first-booking
// eligibility is shown as a label here and enforced when the order is placed
// (POST /api/bookings re-validates the code from the same table).
export async function GET() {
  const today = istTodayISO();
  const coupons = (await readCouponTerms())
    .filter(
      (c) =>
        couponUsable(
          { ...c, eligibility: "" },
          { todayISO: today, occasion: "", isFirstBooking: true },
        ).ok,
    )
    .map((c) => ({
      code: c.code.trim().toUpperCase(),
      label: "label" in c && typeof c.label === "string" ? c.label : c.code,
      percent: c.percent,
      cap: c.cap,
      ...(c.eligibility ? { eligibility: c.eligibility } : {}),
    }));
  return Response.json({ coupons });
}
