const BASE_URL = "http://localhost:3000";

async function testBookingLifecycle() {
  console.log("=== TESTING BOOKING LIFECYCLE & STATUSES ===");

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@bhojpatra.local",
      password: "admin123",
    }),
  });
  const cookie = loginRes.headers.get("set-cookie");
  const authHeaders = {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };

  // Case 1: Connect booking (COD)
  const bookingId1 = `BHJ-${Date.now()}-1`;
  const res1 = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: bookingId1,
      customer: "Connect Customer",
      phone: "9876543210",
      email: "admin@bhojpatra.local",
      occasion: "Feast",
      date: "25 Dec 2026",
      eventDateISO: "2026-12-25",
      packageId: "silver",
      guests: 100,
      vendor: "Bhojpatra",
      city: "Lucknow",
      amount: 94282,
      paid: 0,
      paymentMethod: "Connect",
      pricingInputs: {
        bookingType: "feast",
        packageId: "silver",
        guests: 100,
      },
    }),
  });
  const data1 = await res1.json();
  console.log("Connect Booking Status:", res1.status, "Booking DB Status:", data1?.order?.status, "Paid in DB:", data1?.order?.paid);

  // Case 2: Claiming paid amount when no payment is in ledger
  const bookingId2 = `BHJ-${Date.now()}-2`;
  const res2 = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: bookingId2,
      customer: "Unverified Advance Customer",
      phone: "9876543210",
      email: "admin@bhojpatra.local",
      occasion: "Feast",
      date: "25 Dec 2026",
      eventDateISO: "2026-12-25",
      packageId: "silver",
      guests: 100,
      vendor: "Bhojpatra",
      city: "Lucknow",
      amount: 94282,
      paid: 9428,
      paymentMethod: "Razorpay",
      pricingInputs: {
        bookingType: "feast",
        packageId: "silver",
        guests: 100,
      },
    }),
  });
  console.log("Claiming Advance with no payment record Status:", res2.status, await res2.json());

  // Case 3: Customer creating a Pending EMI booking (with 0 paid claimed)
  const bookingId3 = `BHJ-${Date.now()}-3`;
  const res3 = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      id: bookingId3,
      customer: "EMI Customer",
      phone: "9876543210",
      email: "admin@bhojpatra.local",
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
  const data3 = await res3.json();
  console.log("Pending EMI Booking Creation Status:", res3.status, "Booking DB Status:", data3?.order?.status);

  // Now test Customer hitting PATCH on this Pending EMI booking to "Pay Balance"
  // Note: user is admin here, let's test as a customer (non-admin)
}

testBookingLifecycle().catch(console.error);
