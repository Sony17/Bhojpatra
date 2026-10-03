import { strict as assert } from "assert";

const BASE_URL = "http://localhost:3000";

async function runDetailedInvestigation() {
  console.log("=== COMPREHENSIVE INVESTIGATION OF RAZORPAY PAYMENT IMPLEMENTATION ===\n");

  // 1. Check payment-settings route response
  console.log("--- 1. /api/admin/payment-settings ---");
  const sRes = await fetch(`${BASE_URL}/api/admin/payment-settings`);
  const settings = await sRes.json();
  console.log("Payment settings:", settings);
  console.log("Is razorpayKeyId returned?", Boolean(settings.razorpayKeyId));

  // 2. Test login
  console.log("\n--- 2. User Authentication for Payment APIs ---");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@bhojpatra.local",
      password: "admin123",
    }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  console.log("Login success:", loginRes.ok, "Cookie present:", Boolean(cookie));

  const authHeaders = {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };

  // 3. Test Razorpay Order creation API validation
  console.log("\n--- 3. /api/payments/razorpay/order Validation & Gate ---");
  // Test with missing booking ID
  const noBookingIdRes = await fetch(`${BASE_URL}/api/payments/razorpay/order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ amount: 1000 }),
  });
  console.log("No booking ID response:", noBookingIdRes.status, await noBookingIdRes.text());

  // Test with invalid amount
  const invalidAmtRes = await fetch(`${BASE_URL}/api/payments/razorpay/order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ bookingId: "BHJ-12345", amount: -50 }),
  });
  console.log("Invalid amount response:", invalidAmtRes.status, await invalidAmtRes.text());

  // Test with valid payload
  const validOrderRes = await fetch(`${BASE_URL}/api/payments/razorpay/order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ bookingId: "BHJ-1234567890", amount: 5000, customer: "Tester" }),
  });
  console.log("Valid payload response:", validOrderRes.status, await validOrderRes.text());

  // 4. Test Razorpay Verify API validation
  console.log("\n--- 4. /api/payments/razorpay/verify Validation & Gate ---");
  const validVerifyRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      bookingId: "BHJ-1234567890",
      orderId: "order_test_123",
      paymentId: "pay_test_123",
      signature: "dummy_signature",
      customer: "Tester",
    }),
  });
  console.log("Verify payload response:", validVerifyRes.status, await validVerifyRes.text());

  // 5. Test Webhook signature verification
  console.log("\n--- 5. /api/payments/razorpay/webhook Signature Gate ---");
  const webhookNoSig = await fetch(`${BASE_URL}/api/payments/razorpay/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "payment.captured" }),
  });
  console.log("Webhook no signature response:", webhookNoSig.status, await webhookNoSig.text());

  // 6. Test Bookings PATCH endpoint (Pay Balance logic)
  console.log("\n--- 6. Test Booking PATCH for Pay Balance ---");
  // Let's create a test booking first
  const bookingId = `BHJ-${Date.now()}`;
  const createBookingRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: bookingId,
      customer: "Admin Tester",
      phone: "9876543210",
      email: "admin@bhojpatra.local",
      occasion: "Feast",
      date: "25 Dec 2026",
      eventDateISO: "2026-12-25",
      packageId: "silver",
      guests: 100,
      vendor: "Bhojpatra",
      city: "Lucknow",
      amount: 45000,
      paid: 0,
      paymentMethod: "Connect",
      status: "Confirmed",
      pricingInputs: {
        bookingType: "feast",
        packageId: "silver",
        guests: 100,
      },
    }),
  });
  console.log("Create test booking status:", createBookingRes.status);
  const createdBooking = await createBookingRes.json();
  console.log("Created booking:", createdBooking?.order?.id, createdBooking?.order?.status, "Paid:", createdBooking?.order?.paid);

  // Now test customer trying to patch status or paid
  const patchRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "Confirmed" }),
  });
  console.log("Patch status response:", patchRes.status, await patchRes.text());
}

runDetailedInvestigation().catch(console.error);
