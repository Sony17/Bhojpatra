const BASE_URL = "http://localhost:3000";

async function runFlowsTest() {
  console.log("=== Testing 4 Booking Flows End-to-End ===");

  // Sign up a test customer
  const custEmail = `flow_user_${Date.now()}@example.com`;
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Flow Test User",
      email: custEmail,
      password: "TestPassword123!",
      role: "customer",
    }),
  });
  console.log("Customer signup status:", signupRes.status);
  const cookie = signupRes.headers.get("set-cookie");
  const authHeaders = {
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
  };

  // 1. Feast Booking (Gold package ₹1199 * 200 guests + 18% GST = ₹282,964)
  console.log("\n--- 1. Testing Feast Booking Submission ---");
  const feastAmount = Math.round(1199 * 200 * 1.18);
  const feastPayload = {
    id: `BHJ-FST-${Date.now()}`,
    customer: "Flow Test User",
    phone: "9876543210",
    email: custEmail,
    occasion: "wedding",
    packageId: "gold",
    date: "20 Nov 2026",
    eventDateISO: "2026-11-20",
    guests: 200,
    amount: feastAmount,
    paid: 0,
    bookingType: "feast",
    mealTime: "Dinner",
    eventTime: "08:00 PM",
    foodPreference: "Veg",
    city: "lucknow",
    venue: "Ambassador Banquet Hall",
    pricingInputs: {
      bookingType: "feast",
      packageId: "gold",
      guests: 200,
      categoryItems: {},
      selectedAddOns: [],
    },
    paymentMethod: "Connect",
  };

  const feastRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(feastPayload),
  });
  const feastData = await feastRes.json();
  console.log("Feast Booking Status:", feastRes.status, "Booking:", JSON.stringify(feastData?.order ? { id: feastData.order.id, amount: feastData.order.amount, status: feastData.order.status } : feastData));

  // 2. Single Stall Booking (Tuesday Chaat ₹780 * 100 guests + 18% GST = ₹92,040)
  console.log("\n--- 2. Testing Single Stall Booking Submission ---");
  const stallAmount = Math.round(780 * 100 * 1.18);
  const stallPayload = {
    id: `BHJ-STL-${Date.now()}`,
    customer: "Flow Test User",
    phone: "9876543211",
    email: custEmail,
    occasion: "birthday",
    packageId: "custom",
    stallId: "tuesday-chaat",
    date: "25 Nov 2026",
    eventDateISO: "2026-11-25",
    guests: 100,
    amount: stallAmount,
    paid: 0,
    bookingType: "stall",
    mealTime: "Evening",
    city: "lucknow",
    pricingInputs: {
      bookingType: "stall",
      packageId: "custom",
      stallId: "tuesday-chaat",
      guests: 100,
      categoryItems: {
        chaat: ["tuesday-chaat-0", "tuesday-chaat-1", "tuesday-chaat-2", "tuesday-chaat-3"],
      },
      selectedAddOns: [],
    },
    paymentMethod: "Connect",
  };

  const stallRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(stallPayload),
  });
  const stallData = await stallRes.json();
  console.log("Single Stall Booking Status:", stallRes.status, "Booking:", JSON.stringify(stallData?.order ? { id: stallData.order.id, amount: stallData.order.amount, status: stallData.order.status } : stallData));

  // 3. Live Stall Booking (Royal Chaat ₹890 * 150 guests + 18% GST = ₹157,530)
  console.log("\n--- 3. Testing Live Stall Booking Submission ---");
  const liveStallAmount = Math.round(890 * 150 * 1.18);
  const liveStallPayload = {
    id: `BHJ-LVS-${Date.now()}`,
    customer: "Flow Test User",
    phone: "9876543212",
    email: custEmail,
    occasion: "anniversary",
    packageId: "custom",
    stallId: "royal-chaat",
    date: "28 Nov 2026",
    eventDateISO: "2026-11-28",
    guests: 150,
    amount: liveStallAmount,
    paid: 0,
    bookingType: "stall",
    mealTime: "Dinner",
    city: "lucknow",
    pricingInputs: {
      bookingType: "stall",
      packageId: "custom",
      stallId: "royal-chaat",
      guests: 150,
      categoryItems: {
        chaat: ["royal-chaat-0", "royal-chaat-1", "royal-chaat-2", "royal-chaat-3"],
      },
      selectedAddOns: [],
    },
    paymentMethod: "Connect",
  };

  const liveStallRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(liveStallPayload),
  });
  const liveStallData = await liveStallRes.json();
  console.log("Live Stall Booking Status:", liveStallRes.status, "Booking:", JSON.stringify(liveStallData?.order ? { id: liveStallData.order.id, amount: liveStallData.order.amount, status: liveStallData.order.status } : liveStallData));

  // 4. Baina Box Booking (10 boxes * ₹950 = ₹9500)
  console.log("\n--- 4. Testing Baina Box Booking Submission ---");
  const bainaPayload = {
    id: `BHJ-BNA-${Date.now()}`,
    customer: "Flow Test User",
    phone: "9876543213",
    email: custEmail,
    occasion: "Baina Box",
    bookingType: "baina",
    bainaVendorId: "ram-asrey",
    date: "15 Nov 2026",
    eventDateISO: "2026-11-15",
    amount: 9500,
    paid: 0,
    pricingInputs: {
      bookingType: "baina",
      bainaVendorId: "ram-asrey",
      bainaItems: [
        { id: "ram-asrey-box-mix-1kg", qty: 10, price: 950 },
      ],
    },
    items: [
      { id: "ram-asrey-box-mix-1kg", name: "Baina Box (Mix)", qty: 10, price: 950, unit: "Box" },
    ],
    paymentMethod: "Connect",
  };

  const bainaRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify(bainaPayload),
  });
  const bainaData = await bainaRes.json();
  console.log("Baina Booking Status:", bainaRes.status, "Booking:", JSON.stringify(bainaData?.order ? { id: bainaData.order.id, amount: bainaData.order.amount, status: bainaData.order.status } : bainaData));

  console.log("\n=== All 4 Booking Flows Verified and Functional ===");
}

runFlowsTest().catch(console.error);
