"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";
import LoginGate from "@/components/auth/LoginGate";
import { useLang } from "@/lib/i18n";
import { useSessionStatus } from "@/lib/session";
import { Button, Input, QuantitySelector } from "@/components/ui";
import { DEFAULT_VENDOR_LEAD_DAYS } from "@/lib/data";
import type { BainaBoxVendorData } from "@/lib/bainaBoxData";
import { useBainaCart } from "@/lib/bainaCart";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD` → "05 Sep 2026" (same display shape the booking wizard uses). */
function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr || "—";
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** The city part of a "Locality, City" location string (for the order record). */
function cityOf(location: string): string {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || location;
}

/** Deterministic `BHJ-` reference derived from the order's content — the same
 *  no-random/no-time approach the booking wizard uses, and doubling as an
 *  idempotency key: a double-tap or retry upserts the same record server-side
 *  instead of duplicating it. */
function orderRef(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return `BHJ-B${(Math.abs(h) % 90000) + 10000}`;
}

function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/**
 * The Baina Box order flow — pick boxes with a quantity stepper, choose a
 * delivery date and confirm. Unlike the feast wizard (per-plate catering with a
 * guest minimum), boxes are ordered per box at the card price, so a gifting
 * order of a few boxes is finally possible. Confirmed orders post to
 * /api/bookings ("Bhojpatra connects you" — nothing collected online; our team
 * calls to arrange payment & delivery), so they land in My Bookings, the admin
 * console and the confirmation emails like any other booking.
 */
export default function BainaBoxOrderPanel({
  data,
  qty: externalQty,
  setQty: externalSetQty,
  hideProductsGrid = false,
}: {
  data: BainaBoxVendorData;
  qty?: Record<string, number>;
  setQty?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  hideProductsGrid?: boolean;
}) {
  const { t } = useLang();
  const session = useSessionStatus();
  const cart = useBainaCart();

  // Primary / default box for this vendor (matches fixedPrice or first product).
  const defaultProduct = useMemo(() => {
    return (
      data.products.find((p) => p.price === data.fixedPrice) ??
      data.products[0]
    );
  }, [data.products, data.fixedPrice]);

  const qty = externalQty ?? cart.map;

  // Ensure at least 1 box is selected when user clicks any "Book Now" / "#baina-order" link
  useEffect(() => {
    if (!defaultProduct) return;

    function handleSelectDefault() {
      if (cart.totalBoxes === 0) {
        cart.setQty(defaultProduct.id, 1);
      }
    }

    function onClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest<
        HTMLAnchorElement | HTMLButtonElement
      >('a[href*="#baina-order"], button[href*="#baina-order"]');
      if (anchor) {
        handleSelectDefault();
      }
    }

    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [defaultProduct, cart]);

  const [dateIso, setDateIso] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});
  const effName = touched.name ? name : name || session?.name || "";
  const effEmail = touched.email ? email : email || session?.email || "";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ id: string; amount: number } | null>(
    null,
  );

  const lines = useMemo(() => {
    if (cart.lines.length > 0) {
      return cart.lines;
    }
    return data.products
      .map((p) => ({
        id: p.id,
        vendorId: data.vendorId,
        vendorSlug: data.slug,
        vendorName: data.name,
        name: p.name,
        price: p.price,
        unit: p.unit,
        qty: qty[p.id] ?? 0,
        image: p.image,
      }))
      .filter((p) => p.qty > 0);
  }, [cart.lines, data, qty]);

  const totalBoxes = lines.reduce((n, l) => n + l.qty, 0);
  const totalAmount = lines.reduce((n, l) => n + l.qty * l.price, 0);

  const additionalProducts = useMemo(() => {
    if (!defaultProduct) return data.products;
    return data.products.filter((p) => p.id !== defaultProduct.id);
  }, [data.products, defaultProduct]);

  const setCount = (id: string, next: number) => {
    if (externalSetQty) {
      externalSetQty((m) => ({ ...m, [id]: next }));
    }
    cart.setQty(id, next);
  };

  const handleConfirm = async () => {
    setError("");
    if (totalBoxes === 0) {
      setError(t("Add at least one box above.", "ऊपर कम से कम एक डिब्बा जोड़ें।"));
      return;
    }
    if (!dateIso) {
      setError(t("Pick a delivery date.", "डिलीवरी की तारीख़ चुनें।"));
      return;
    }
    if (!effName.trim()) {
      setError(t("Please enter your name.", "कृपया अपना नाम दर्ज करें।"));
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError(
        t("Please enter a valid phone number.", "कृपया सही फ़ोन नंबर दर्ज करें।"),
      );
      return;
    }
    if (!isValidEmail(effEmail)) {
      setError(
        t("Please enter a valid email address.", "कृपया सही ईमेल पता दर्ज करें।"),
      );
      return;
    }

    const id = orderRef(
      [data.vendorId, dateIso, ...lines.map((l) => `${l.id}x${l.qty}`)].join("|"),
    );
    const receipt = [
      "BHOJPATRA — BAINA BOX ORDER",
      `Booking ID: ${id}`,
      `Brand: ${data.name} (${data.location})`,
      `Delivery date: ${formatEventDate(dateIso)}`,
      ...(address.trim() ? [`Deliver to: ${address.trim()}`] : []),
      "",
      ...lines.map(
        (l) =>
          `${l.name} — ${l.qty} × ₹${l.price.toLocaleString("en-IN")} = ₹${(
            l.qty * l.price
          ).toLocaleString("en-IN")}`,
      ),
      "",
      `Total (${totalBoxes} ${totalBoxes === 1 ? "box" : "boxes"}): ₹${totalAmount.toLocaleString("en-IN")}`,
      "Payment: Bhojpatra connects you — our team calls to arrange payment & delivery.",
    ].join("\n");

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          customer: effName.trim(),
          phone: phone.trim(),
          email: effEmail.trim(),
          occasion: "Baina Box",
          date: formatEventDate(dateIso),
          eventDateISO: dateIso,
          packageId: "custom",
          // Box count stands in for guests on a per-box order — the receipt
          // and amount carry the real story.
          guests: totalBoxes,
          vendor: data.name,
          city: cityOf(data.location),
          venue: address.trim() || undefined,
          amount: totalAmount,
          paid: 0,
          paymentMethod: "Connect",
          status: "Confirmed",
          vendors: [{ id: data.vendorId, name: data.name }],
          receipt,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(
          body?.error ??
            t(
              "Couldn't place your order. Please try again.",
              "आपका ऑर्डर नहीं हो सका। कृपया पुनः प्रयास करें।",
            ),
        );
        return;
      }
      setPlaced({ id, amount: totalAmount });
      cart.clear();
    } catch {
      setError(
        t(
          "Network error. Please check your connection and try again.",
          "नेटवर्क त्रुटि। कृपया अपना कनेक्शन जाँचें और पुनः प्रयास करें।",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Confirmed — replace the panel with the order summary ─────────── */
  if (placed) {
    return (
      <div className="mt-12 border-t border-cream-3 pt-8" id="baina-order">
        <div className="mx-auto max-w-lg rounded-card border border-maroon/15 bg-cream/40 p-6 text-center sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-maroon text-2xl text-cream">
            ✓
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold text-maroon">
            {t("Order placed!", "ऑर्डर हो गया!")}
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            {t(
              `Your Baina Box order with ${data.name} is confirmed. Our team will call you to arrange payment & delivery.`,
              `${data.name} के साथ आपका बैना बॉक्स ऑर्डर कन्फर्म है। भुगतान और डिलीवरी के लिए हमारी टीम आपको कॉल करेगी।`,
            )}
          </p>
          <p className="mt-4 text-sm text-ink">
            <span className="font-semibold">{t("Booking ID", "बुकिंग आईडी")}:</span>{" "}
            {placed.id}
            <span className="mx-2 text-ink-soft">·</span>
            <span className="font-semibold">₹{placed.amount.toLocaleString("en-IN")}</span>
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/bookings">{t("View My Bookings", "मेरी बुकिंग देखें")}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPlaced(null);
                cart.clear();
              }}
            >
              {t("Order more boxes", "और डिब्बे ऑर्डर करें")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Boxes & sweets grid — pick quantities (excluding primary item in inspection) ── */}
      {!hideProductsGrid && additionalProducts.length > 0 && (
        <div className="mt-12 border-t border-cream-3 pt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-maroon sm:text-2xl">
              {t("Order Sweets & Boxes", "मिठाई और डिब्बे ऑर्डर करें")}
            </h2>
            <Link
              href="/baina-box"
              className="text-xs font-semibold text-maroon transition hover:underline sm:text-sm"
            >
              {t("View All →", "सभी देखें →")}
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {additionalProducts.map((prod) => {
            const count = qty[prod.id] ?? 0;
            return (
              <div
                key={prod.id}
                className={`group flex flex-col overflow-hidden rounded-card border bg-white p-3 shadow-sm transition hover:shadow-card ${
                  count > 0 ? "border-maroon/40" : "border-cream-3 hover:border-maroon/20"
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream">
                  <Image
                    src={prod.image}
                    alt={prod.name}
                    fill
                    sizes="(min-width: 640px) 250px, 180px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="mt-3 flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-ink">
                      {prod.name}
                    </h3>
                    <p className="mt-1 font-display text-base font-bold text-maroon">
                      ₹{prod.price.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-normal text-ink-soft">
                        / {prod.unit}
                      </span>
                    </p>
                  </div>
                  {count === 0 ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCount(prod.id, 1)}
                      className="mt-3 w-full border-maroon/20 text-maroon hover:bg-maroon hover:text-white"
                    >
                      {t("Add Box", "डिब्बा जोड़ें")}
                    </Button>
                  ) : (
                    <QuantitySelector
                      value={count}
                      onChange={(n) => setCount(prod.id, n)}
                      min={0}
                      max={200}
                      size="sm"
                      label={prod.name}
                      className="mt-3 self-center"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Order summary & confirm ───────────────────────────────────── */}
      <div className="mt-8" id="baina-order">
        {totalBoxes === 0 ? (
          <div className="rounded-card border border-cream-3 bg-cream/30 p-6 text-center shadow-sm">
            <p className="text-sm text-ink-soft">
              {t(
                "Add boxes above to start your order.",
                "ऑर्डर शुरू करने के लिए ऊपर डिब्बे जोड़ें।",
              )}
            </p>
            {defaultProduct && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 border-maroon/20 text-maroon hover:bg-maroon hover:text-white"
                onClick={() => setCount(defaultProduct.id, 1)}
              >
                {t(
                  `Add 1 ${defaultProduct.name} (₹${defaultProduct.price.toLocaleString("en-IN")})`,
                  `1 ${defaultProduct.name} जोड़ें (₹${defaultProduct.price.toLocaleString("en-IN")})`,
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-card border border-maroon/15 bg-white shadow-card">
            <div className="border-b border-cream-3 bg-cream/40 px-5 py-4">
              <h3 className="font-display text-lg font-bold text-maroon">
                {t("Your Baina Order", "आपका बैना ऑर्डर")}
              </h3>
            </div>

            <div className="px-5 py-4">
              <ul className="divide-y divide-cream-2 text-sm">
                {lines.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-nowrap">
                    <div className="min-w-0 flex-1 truncate text-ink">
                      <span className="font-semibold">{l.name}</span>
                      {"vendorName" in l && l.vendorName && l.vendorName !== data.name && (
                        <span className="ml-1.5 text-xs text-ink-soft">({l.vendorName})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <QuantitySelector
                        value={l.qty}
                        onChange={(n) => setCount(l.id, n)}
                        min={0}
                        max={200}
                        size="sm"
                        label={l.name}
                      />
                      <span className="min-w-[4.25rem] text-right font-semibold text-ink">
                        ₹{(l.qty * l.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 py-3">
                  <span className="font-semibold text-ink">
                    {t("Total", "कुल")}{" "}
                    <span className="font-normal text-ink-soft">
                      · {totalBoxes} {totalBoxes === 1 ? t("box", "डिब्बा") : t("boxes", "डिब्बे")}
                    </span>
                  </span>
                  <span className="font-display text-xl font-bold text-maroon">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </span>
                </li>
              </ul>

              {session === null ? (
                // Signed out — the same inline gate the booking wizard uses;
                // once the login lands, `useSessionStatus` re-renders and the
                // order form (with the boxes untouched) appears in its place.
                <div className="mt-4">
                  <LoginGate />
                </div>
              ) : (
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-ink-soft" htmlFor="baina-date">
                      {t("Delivery date", "डिलीवरी की तारीख़")}
                    </label>
                    <div
                      id="baina-date"
                      className="rounded-2xl border border-cream bg-white shadow-soft"
                    >
                      <DatePicker
                        placeholder={t("Select date", "तारीख़ चुनें")}
                        ariaLabel={t("Delivery date", "डिलीवरी की तारीख़")}
                        minDaysAhead={DEFAULT_VENDOR_LEAD_DAYS}
                        valueIso={dateIso}
                        onChange={(d) =>
                          setDateIso(
                            `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-ink-soft" htmlFor="baina-name">
                      {t("Full name", "पूरा नाम")}
                    </label>
                    <Input
                      id="baina-name"
                      value={effName}
                      onChange={(e) => {
                        setTouched((s) => ({ ...s, name: true }));
                        setName(e.target.value);
                      }}
                      placeholder={t("e.g. Ankit Sharma", "जैसे अंकित शर्मा")}
                      autoComplete="name"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-ink-soft" htmlFor="baina-phone">
                      {t("Phone number", "फ़ोन नंबर")}
                    </label>
                    <Input
                      id="baina-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("10-digit mobile", "10 अंकों का मोबाइल")}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm text-ink-soft" htmlFor="baina-email">
                      {t("Email", "ईमेल")}
                    </label>
                    <Input
                      id="baina-email"
                      type="email"
                      value={effEmail}
                      onChange={(e) => {
                        setTouched((s) => ({ ...s, email: true }));
                        setEmail(e.target.value);
                      }}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-sm text-ink-soft" htmlFor="baina-address">
                      {t("Delivery address", "डिलीवरी पता")}
                    </label>
                    <Input
                      id="baina-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t(
                        "e.g. 12 Hazratganj, Lucknow",
                        "जैसे 12 हज़रतगंज, लखनऊ",
                      )}
                      autoComplete="street-address"
                    />
                  </div>

                  {error && (
                    <p className="rounded-control border border-maroon bg-maroon/10 px-3 py-2 text-sm font-medium text-maroon sm:col-span-2">
                      {error}
                    </p>
                  )}

                  <div className="sm:col-span-2">
                    <Button
                      size="lg"
                      fullWidth
                      loading={submitting}
                      onClick={handleConfirm}
                    >
                      {submitting
                        ? t("Placing order…", "ऑर्डर हो रहा है…")
                        : `${t("Confirm Order", "ऑर्डर कन्फर्म करें")} · ₹${totalAmount.toLocaleString("en-IN")}`}
                    </Button>
                    <p className="mt-2 text-center text-xs text-ink-soft">
                      {t(
                        "Nothing to pay online — our team calls to arrange payment & delivery.",
                        "अभी कोई ऑनलाइन भुगतान नहीं — भुगतान और डिलीवरी के लिए हमारी टीम कॉल करेगी।",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
