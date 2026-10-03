import { strict as assert } from "assert";

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== RAZORPAY & FEAST BOOKING INVESTIGATION SUITE ===\n");

  // 1. Payment Settings Check
  console.log("[1] Checking /api/admin/payment-settings...");
  const settingsRes = await fetch(`${BASE_URL}/api/admin/payment-settings`);
  const settings = await settingsRes.json();
  console.log("Status:", settingsRes.status);
  console.log("Settings response:", JSON.stringify(settings, null, 2));
  console.log("razorpayKeyId present?", "razorpayKeyId" in settings, settings.razorpayKeyId);

  // 2. Unauthenticated calls to Razorpay routes
  console.log("\n[2] Testing unauthenticated calls to Razorpay routes...");
  
  // 2a. Razorpay Order Creation
  const orderRes = await fetch(`${BASE_URL}/api/payments/razorpay/order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: "BHJ-TEST-12345",
      amount: 5000,
      customer: "Test User",
    }),
  });
  console.log("Order Route (Unauth) Status:", orderRes.status);
  console.log("Order Route (Unauth) Body:", await orderRes.text());

  // 2b. Razorpay Verify Route
  const verifyRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bookingId: "BHJ-TEST-12345",
      orderId: "order_test_123",
      paymentId: "pay_test_123",
      signature: "dummy_sig",
      customer: "Test User",
    }),
  });
  console.log("Verify Route (Unauth) Status:", verifyRes.status);
  console.log("Verify Route (Unauth) Body:", await verifyRes.text());

  // 2c. Razorpay Webhook Route (Auth is signature, not session)
  const webhookRes = await fetch(`${BASE_URL}/api/payments/razorpay/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": "dummy_sig",
    },
    body: JSON.stringify({ event: "payment.captured" }),
  });
  console.log("Webhook Route (Invalid Sig) Status:", webhookRes.status);
  console.log("Webhook Route (Invalid Sig) Body:", await webhookRes.text());

  // 3. Login to obtain session cookie
  console.log("\n[3] Logging in as admin to test authenticated flows...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@bhojpatra.local",
      password: "admin123",
    }),
  });
  console.log("Login Status:", loginRes.status);
  const setCookieHeader = loginRes.headers.get("set-cookie");
  console.log("Set-Cookie:", setCookieHeader ? "Cookie received" : "None");

  const authHeaders = {
    "Content-Type": "application/json",
    ...(setCookieHeader ? { Cookie: setCookieHeader } : {}),
  };

  // 4. Authenticated Order Route call
  console.log("\n[4] Testing authenticated Order creation...");
  const authOrderRes = await fetch(`${BASE_URL}/api/payments/razorpay/order`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      bookingId: "BHJ-TEST-12345",
      amount: 5000,
      customer: "Test User",
    }),
  });
  console.log("Auth Order Status:", authOrderRes.status);
  console.log("Auth Order Body:", await authOrderRes.text());

  // 5. Authenticated Verify Route call
  console.log("\n[5] Testing authenticated Payment Verification...");
  const authVerifyRes = await fetch(`${BASE_URL}/api/payments/razorpay/verify`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      bookingId: "BHJ-TEST-12345",
      orderId: "order_test_123",
      paymentId: "pay_test_123",
      signature: "dummy_sig",
      customer: "Test User",
    }),
  });
  console.log("Auth Verify Status:", authVerifyRes.status);
  console.log("Auth Verify Body:", await authVerifyRes.text());
}

runTests().catch(console.error);
