const BASE_URL = "http://localhost:3000";

async function testCustomerPayBalance() {
  console.log("=== TESTING CUSTOMER PAY BALANCE ACTION VIA PATCH /api/bookings/[id] ===");

  // 1. Sign up as regular customer
  const custEmail = `customer_${Date.now()}@example.com`;
  const custPw = "CustomerPass123!";
  
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Customer",
      email: custEmail,
      password: custPw,
      role: "customer",
    }),
  });
  console.log("Customer signup status:", signupRes.status);
  const cookie = signupRes.headers.get("set-cookie");
  const authHeaders = {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };

  // 2. Customer creates a Pending EMI booking (0 paid up front)
  const bookingId = `BHJ-${Date.now()}-CUST`;
  const createRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: bookingId,
      customer: "Test Customer",
      phone: "9876543210",
      email: custEmail,
      occasion: "Feast",
      date: "25 Dec 2026",
      eventDateISO: "2026-12-25",
      packageId: "silver",
      guests: 100,
      vendor: "Bhojpatra",
      city: "Lucknow",
      amount: 94282,
      paid: 0,
      paymentMethod: "UPI",
      emiPlan: {
        count: 2,
        balance: 84854,
        installments: [
          { index: 1, amount: 42427, dueDate: "2026-11-25", dueLabel: "25 Nov 2026" },
          { index: 2, amount: 42427, dueDate: "2026-12-20", dueLabel: "20 Dec 2026" }
        ]
      },
      pricingInputs: {
        bookingType: "feast",
        packageId: "silver",
        guests: 100,
      },
    }),
  });
  console.log("Create booking status:", createRes.status);

  // 3. Customer clicks "Pay Balance" button (runs `patchMyBooking(booking.id, { status: "Confirmed" })`)
  const patchRes = await fetch(`${BASE_URL}/api/bookings/${bookingId}`, {
    method: "PATCH",
    headers: authHeaders,
    body: JSON.stringify({ status: "Confirmed" }),
  });
  console.log("Pay Balance PATCH status:", patchRes.status, await patchRes.json());
}

testCustomerPayBalance().catch(console.error);
