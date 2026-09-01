"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import DatePicker from "@/components/DatePicker";
import LoginGate from "@/components/auth/LoginGate";
import { useLang } from "@/lib/i18n";
import { useSessionStatus } from "@/lib/session";
import { Button, Input, QuantitySelector } from "@/components/ui";
import { DEFAULT_VENDOR_LEAD_DAYS, coupons, type Coupon } from "@/lib/data";
import { isValidEmail, isValidPhone } from "@/lib/validate";
import { getBainaBoxVendorByVendorId, type BainaOrderVendor } from "@/lib/bainaBoxData";
import { saveBainaCart, clearBainaCart } from "@/lib/bainaCart";
import { ADVANCE_RATE } from "@/lib/bookingPricing";
import { type OrderPaymentMethod } from "@/lib/orderPayment";
import {
  DEFAULT_REFERRAL_RATES,
  customerPercentFor,
  type ReferralRates,
} from "@/lib/referralRates";
import {
  startRazorpayCheckout,
  RazorpayCheckoutError,
} from "@/lib/razorpayCheckout";

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

/** How an ordered line reads in the summary and on the receipt. A vendor sells
 *  the same box in several sizes, so the size has to ride along with the name —
 *  except when it adds nothing ("Kaju Katli (Box)"). */
function lineLabel(l: { name: string; unit: string }): string {
  return l.unit.trim().toLowerCase() === "box" ? l.name : `${l.name} · ${l.unit}`;
}

/**
 * Per-box order panel for sweet houses & gifting specialists. Used on curated
 * detail pages (/baina-box/<slug>) and any live vendor who published a box menu
 * in their dashboard (/vendors/<id>).
 */
export default function BainaBoxOrderPanel({
  data,
  heading,
  allHref,
}: {
  data: BainaOrderVendor;
  heading?: string;
  allHref?: string;
}) {
  const { t } = useLang();
  const session = useSessionStatus();

  const vendorSlug = useMemo(
    () => (data as { slug?: string }).slug || getBainaBoxVendorByVendorId(data.vendorId)?.slug || data.vendorId,
    [data],
  );

  const signatureProduct = useMemo(() => {
    if (!data.products.length) return null;
    const fp = (data as { fixedPrice?: number }).fixedPrice;
    return (
      data.products.find((p) => fp !== undefined && p.price === fp) ??
      data.products[0]
    );
  }, [data]);

  const [qty, setQty] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("bhojpatra:baina-cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.vendorId === data.vendorId && parsed?.qty && Object.keys(parsed.qty).length > 0) {
            const validQty: Record<string, number> = {};
            for (const p of data.products) {
              if (parsed.qty[p.id]) validQty[p.id] = parsed.qty[p.id];
            }
            if (Object.keys(validQty).length > 0) {
              return validQty;
            }
          }
        }
      } catch {}
    }
    if (data.products.length > 0) {
      const fp = (data as { fixedPrice?: number }).fixedPrice;
      const signature =
        data.products.find((p) => fp !== undefined && p.price === fp) ??
        data.products[0];
      return { [signature.id]: 1 };
    }
    return {};
  });

  useEffect(() => {
    saveBainaCart({
      vendorId: data.vendorId,
      vendorSlug,
      vendorName: data.name,
      qty,
    });
  }, [data.vendorId, vendorSlug, data.name, qty]);

  const [dateIso, setDateIso] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean }>({});
  const effName = touched.name ? name : name || session?.name || "";
  const effEmail = touched.email ? email : email || session?.email || "";

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState("");

  const applyCouponCode = (raw: string) => {
    const code = raw.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === code);
    if (found) {
      setAppliedCoupon(found);
      setCouponInput(found.code);
      setCouponError("");
    } else {
      setAppliedCoupon(null);
      setCouponError(t("Invalid coupon code.", "अमान्य कूपन कोड।"));
    }
  };
  const applyCoupon = () => applyCouponCode(couponInput);
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  // Referral state
  const [referralCode, setReferralCode] = useState("");
  const [referrerName, setReferrerName] = useState("");
  const [referrerType, setReferrerType] = useState("");
  const [referralRates] = useState<ReferralRates>(DEFAULT_REFERRAL_RATES);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const ref = sp.get("ref");
    if (ref) setReferralCode(ref.trim().toUpperCase());
  }, []);

  useEffect(() => {
    const trimmed = referralCode.trim().toUpperCase();
    if (!trimmed) {
      setReferrerName("");
      setReferrerType("");
      return;
    }
    let active = true;
    fetch(`/api/partners/${encodeURIComponent(trimmed)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!active) return;
        if (resData?.partner) {
          setReferrerName(resData.partner.name);
          setReferrerType(resData.partner.type);
        } else {
          setReferrerName("");
          setReferrerType("");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [referralCode]);

  // Payment gateway configuration
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>("");
  const [payMethod, setPayMethod] = useState<OrderPaymentMethod>("Connect");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!active || !cfg) return;
        if (typeof cfg.razorpayKeyId === "string" && cfg.razorpayKeyId) {
          setRazorpayKeyId(cfg.razorpayKeyId);
          setPayMethod("Razorpay");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{
    id: string;
    amount: number;
    paid: number;
    paymentMethod: OrderPaymentMethod;
    paymentRef?: string;
  } | null>(null);

  const lines = useMemo(
    () =>
      data.products
        .map((p) => ({ ...p, qty: qty[p.id] ?? 0 }))
        .filter((p) => p.qty > 0),
    [data.products, qty],
  );
  const totalBoxes = lines.reduce((n, l) => n + l.qty, 0);
  const totalAmount = lines.reduce((n, l) => n + l.qty * l.price, 0);

  const couponDiscount = appliedCoupon
    ? Math.min((totalAmount * appliedCoupon.percent) / 100, appliedCoupon.cap)
    : 0;
  const referralCustomerPercent = referrerName
    ? customerPercentFor(referralRates, referrerType)
    : 0;
  const referralDiscount = Math.max(
    0,
    Math.min(
      Math.round((totalAmount * referralCustomerPercent) / 100),
      totalAmount - couponDiscount,
    ),
  );
  const grandTotal = Math.max(0, totalAmount - couponDiscount - referralDiscount);
  const advanceAmount = Math.max(1, Math.round(grandTotal * ADVANCE_RATE));

  useEffect(() => {
    let hasSavedForVendor = false;
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem("bhojpatra:baina-cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.vendorId === data.vendorId && parsed?.qty && Object.keys(parsed.qty).length > 0) {
            const validQty: Record<string, number> = {};
            for (const p of data.products) {
              if (parsed.qty[p.id]) validQty[p.id] = parsed.qty[p.id];
            }
            if (Object.keys(validQty).length > 0) {
              setQty(validQty);
              hasSavedForVendor = true;
            }
          }
        }
      } catch {}
    }
    if (!hasSavedForVendor) {
      if (signatureProduct) {
        setQty({ [signatureProduct.id]: 1 });
      } else {
        setQty({});
      }
    }
    setError("");
    setPlaced(null);
  }, [data.vendorId, data.products, signatureProduct]);

  useEffect(() => {
    const handleAdd = () => {
      setQty((prev) => {
        const hasCurrentVendorProduct = data.products.some((p) => (prev[p.id] ?? 0) > 0);
        if (!hasCurrentVendorProduct && signatureProduct) {
          const cleaned: Record<string, number> = {};
          for (const p of data.products) {
            if (prev[p.id]) cleaned[p.id] = prev[p.id];
          }
          return { ...cleaned, [signatureProduct.id]: 1 };
        }
        return prev;
      });
      const el = document.getElementById("baina-order");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    window.addEventListener("baina:add-signature", handleAdd);
    window.addEventListener("hashchange", handleAdd);
    return () => {
      window.removeEventListener("baina:add-signature", handleAdd);
      window.removeEventListener("hashchange", handleAdd);
    };
  }, [data.products, signatureProduct]);

  const setCount = (id: string, next: number) =>
    setQty((m) => {
      if (next <= 0) {
        const nextMap = { ...m };
        delete nextMap[id];
        return nextMap;
      }
      return { ...m, [id]: next };
    });

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
    if (!isValidPhone(phone)) {
      setError(
        t("Please enter a valid 10-digit mobile number.", "कृपया सही 10-अंकीय मोबाइल नंबर दर्ज करें।"),
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
      [data.vendorId, effEmail.trim(), phone.trim(), dateIso, ...lines.map((l) => `${l.id}x${l.qty}`)].join("|"),
    );

    let paidAmount = 0;
    let paymentRefId: string | undefined = undefined;

    if (payMethod === "Razorpay") {
      setSubmitting(true);
      try {
        const checkoutRes = await startRazorpayCheckout({
          bookingId: id,
          amount: advanceAmount,
          note: `Bhojpatra — ${data.name} Baina Box`,
          customerName: effName.trim(),
          customerEmail: effEmail.trim(),
          customerPhone: phone.trim(),
        });
        paidAmount = checkoutRes.amountPaid;
        paymentRefId = checkoutRes.paymentId;
      } catch (err) {
        setSubmitting(false);
        if (err instanceof RazorpayCheckoutError) {
          if (err.code === "dismissed") {
            setError(
              t(
                "Payment was cancelled. You can try again or choose Pay on Delivery.",
                "भुगतान रद्द कर दिया गया। आप पुनः प्रयास कर सकते हैं या डिलीवरी पर भुगतान चुन सकते हैं।",
              ),
            );
            return;
          }
          setError(
            err.message ||
              t(
                "Payment failed. Please try again or choose Pay on Delivery.",
                "भुगतान विफल रहा। कृपया पुनः प्रयास करें या डिलीवरी पर भुगतान चुनें।",
              ),
          );
          return;
        }
        setError(
          t(
            "Could not initiate payment window. Please try again.",
            "भुगतान विंडो शुरू नहीं हो सकी। कृपया पुनः प्रयास करें।",
          ),
        );
        return;
      }
    }

    const receipt = [
      "BHOJPATRA — BAINA BOX ORDER",
      `Booking ID: ${id}`,
      `Brand: ${data.name} (${data.location})`,
      `Delivery date: ${formatEventDate(dateIso)}`,
      ...(address.trim() ? [`Deliver to: ${address.trim()}`] : []),
      "",
      ...lines.map(
        (l) =>
          `${lineLabel(l)} — ${l.qty} × ₹${l.price.toLocaleString("en-IN")} = ₹${(
            l.qty * l.price
          ).toLocaleString("en-IN")}`,
      ),
      "",
      `Items Total (${totalBoxes} ${totalBoxes === 1 ? "box" : "boxes"}): ₹${totalAmount.toLocaleString("en-IN")}`,
      ...(couponDiscount > 0 ? [`Coupon Discount (${appliedCoupon?.code}): -₹${couponDiscount.toLocaleString("en-IN")}`] : []),
      ...(referralDiscount > 0 ? [`Referral Discount: -₹${referralDiscount.toLocaleString("en-IN")}`] : []),
      `Grand Total: ₹${grandTotal.toLocaleString("en-IN")}`,
      payMethod === "Razorpay"
        ? `Payment: ₹${paidAmount.toLocaleString("en-IN")} paid online via Razorpay (Ref: ${paymentRefId ?? "verified"}). Balance ₹${(grandTotal - paidAmount).toLocaleString("en-IN")} on delivery.`
        : "Payment: Connect / Pay on delivery — our team calls to arrange payment & delivery.",
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
          guests: totalBoxes,
          vendor: data.name,
          city: cityOf(data.location),
          venue: address.trim() || undefined,
          amount: grandTotal,
          paid: paidAmount,
          paymentMethod: payMethod,
          paymentRef: paymentRefId,
          referralCode: referralCode.trim() || undefined,
          referrerName: referrerName || undefined,
          referrerType: referrerType || undefined,
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
      setPlaced({
        id,
        amount: grandTotal,
        paid: paidAmount,
        paymentMethod: payMethod,
        paymentRef: paymentRefId,
      });
      clearBainaCart();
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
    const balance = Math.max(0, placed.amount - placed.paid);
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
              `Your Baina Box order with ${data.name} is confirmed. Our team will contact you to coordinate delivery.`,
              `${data.name} के साथ आपका बैना बॉक्स ऑर्डर कन्फर्म है। डिलीवरी समन्वय के लिए हमारी टीम आपसे संपर्क करेगी।`,
            )}
          </p>
          <div className="mt-4 rounded-xl border border-cream-3 bg-white p-4 text-left text-xs space-y-1.5 text-ink-soft">
            <div className="flex justify-between font-semibold text-ink">
              <span>{t("Booking ID", "बुकिंग आईडी")}:</span>
              <span className="font-mono text-maroon">{placed.id}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("Total Amount", "कुल राशि")}:</span>
              <span className="font-bold text-ink">₹{placed.amount.toLocaleString("en-IN")}</span>
            </div>
            {placed.paid > 0 ? (
              <>
                <div className="flex justify-between text-green-700 font-medium">
                  <span>{t("Paid Online (Advance)", "ऑनलाइन भुगतान (एडवांस)")}:</span>
                  <span>₹{placed.paid.toLocaleString("en-IN")}</span>
                </div>
                {placed.paymentRef && (
                  <div className="flex justify-between text-[11px] text-ink-soft">
                    <span>{t("Payment Ref", "भुगतान संदर्भ")}:</span>
                    <span className="font-mono">{placed.paymentRef}</span>
                  </div>
                )}
                {balance > 0 && (
                  <div className="flex justify-between font-semibold text-ink border-t border-cream-2 pt-1.5 mt-1.5">
                    <span>{t("Balance on Delivery", "डिलीवरी पर बकाया")}:</span>
                    <span className="text-maroon">₹{balance.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between text-ink font-medium">
                <span>{t("Payment Mode", "भुगतान मोड")}:</span>
                <span>{t("Connect / Pay on Delivery", "डिलीवरी पर भुगतान / कनेक्ट")}</span>
              </div>
            )}
          </div>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/bookings">{t("View My Bookings", "मेरी बुकिंग देखें")}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPlaced(null);
                setQty({});
                clearBainaCart();
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
      {/* ── Boxes & sweets grid — pick quantities ─────────────────────── */}
      <div className="mt-12 scroll-mt-20 border-t border-cream-3 pt-8" id="baina-order">
        {/* Positioning banner: Smaller Parties & Festive Gifting */}
        <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-maroon/20 bg-cream/40 px-4 py-2.5 text-xs text-ink">
          <span className="text-base" aria-hidden="true">🎁</span>
          <span>
            <strong className="font-semibold text-maroon">
              {t("Smaller Parties & Festive Gifting", "छोटी पार्टियाँ और त्यौहार उपहार")}
            </strong>
            {" — "}
            {t(
              "No minimum guest count required. Order customized sweet & savoury hampers for any party size.",
              "कोई न्यूनतम मेहमान सीमा नहीं। किसी भी संख्या के लिए कस्टमाइज़्ड डिब्बे ऑर्डर करें।",
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-maroon sm:text-2xl">
            {heading ?? t("Order Sweets & Boxes", "मिठाई और डिब्बे ऑर्डर करें")}
          </h2>
          {allHref && (
            <Link
              href={allHref}
              className="text-xs font-semibold text-maroon transition hover:underline sm:text-sm"
            >
              {t("View All →", "सभी देखें →")}
            </Link>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {data.products.map((prod) => {
            const count = qty[prod.id] ?? 0;
            return (
              <div
                key={prod.id}
                className={`group flex flex-col overflow-hidden rounded-card border bg-white p-3 shadow-sm transition hover:shadow-card ${
                  count > 0 ? "border-maroon/40" : "border-cream-3 hover:border-maroon/20"
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-cream">
                  {prod.image ? (
                    <Image
                      src={prod.image}
                      alt={prod.name}
                      fill
                      sizes="(min-width: 640px) 250px, 180px"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-full w-full items-center justify-center text-2xl text-maroon/40"
                    >
                      🎁
                    </span>
                  )}
                  {count > 0 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-maroon px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      <span aria-hidden="true">✓</span> {count} {t("in order", "ऑर्डर में")}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-1 flex-col justify-between">
                  <div>
                    <h3 className="font-sans text-sm font-bold text-ink">
                      {prod.name}
                    </h3>
                    {prod.desc && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-ink-soft">
                        {prod.desc}
                      </p>
                    )}
                    <p className="mt-1 font-display text-base font-bold text-maroon">
                      ₹{prod.price.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-normal text-ink-soft">
                        / {prod.unit}
                      </span>
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCount(prod.id, count > 0 ? count + 1 : 1)}
                    className="mt-3 w-full border-maroon/20 text-maroon hover:bg-maroon hover:text-white"
                  >
                    + {t("Add Box", "डिब्बा जोड़ें")}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Order summary & confirm ───────────────────────────────────── */}
      <div className="mt-8">
        {totalBoxes === 0 ? (
          <div className="rounded-card border border-dashed border-maroon/30 bg-cream/30 p-5 text-center">
            <p className="font-semibold text-ink">
              {t(
                "Select your boxes above to start your order",
                "ऑर्डर शुरू करने के लिए ऊपर डिब्बे चुनें",
              )}
            </p>
            {data.products[0] && (
              <div className="mt-3 flex justify-center">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setCount(data.products[0].id, 1)}
                >
                  + {t("Add", "जोड़ें")} {data.products[0].name} (₹{data.products[0].price.toLocaleString("en-IN")})
                </Button>
              </div>
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
                  <li key={l.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">
                          {lineLabel(l)}
                        </p>
                        <p className="text-xs text-ink-soft">
                          ₹{l.price.toLocaleString("en-IN")} / {l.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-base font-bold text-maroon">
                          ₹{(l.qty * l.price).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-cream-2/60 pt-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Quantity", "मात्रा")}:
                      </span>
                      <QuantitySelector
                        value={l.qty}
                        onChange={(n) => setCount(l.id, n)}
                        min={0}
                        max={200}
                        size="sm"
                        label={`${l.name} quantity`}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {session === undefined ? (
                // Loading state — clean placeholder while session resolves to avoid flash
                <div className="mt-4 min-h-[14rem] animate-pulse rounded-2xl bg-cream-2/40" />
              ) : session === null ? (
                // Signed out — the same inline gate the booking wizard uses;
                // once the login lands, `useSessionStatus` re-renders and the
                // order form (with the boxes untouched) appears in its place.
                <div className="mt-4">
                  <LoginGate />
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center justify-between text-sm text-ink-soft" htmlFor="baina-date">
                      <span>{t("Delivery date", "डिलीवरी की तारीख़")}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[10px] font-semibold text-maroon">
                        ⚡ {t("Next-day available", "अगले दिन उपलब्ध")}
                      </span>
                    </label>
                    <div
                      id="baina-date"
                      className="rounded-2xl border border-cream bg-white shadow-soft"
                    >
                      <DatePicker
                        placeholder={t("Select date", "तारीख़ चुनें")}
                        ariaLabel={t("Delivery date", "डिलीवरी की तारीख़")}
                        minDaysAhead={1}
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
                      {t("Delivery address (optional)", "डिलीवरी पता (वैकल्पिक)")}
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

                  {/* ── Coupons / Promo code ───────────────────────────── */}
                  <div className="sm:col-span-2 rounded-xl border border-cream-2 bg-cream/30 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-maroon">
                        🎟️ {t("Have a coupon?", "कूपन कोड है?")}
                      </span>
                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={removeCoupon}
                          className="text-xs font-semibold text-maroon hover:underline"
                        >
                          {t("Remove", "हटाएं")}
                        </button>
                      )}
                    </div>
                    {appliedCoupon ? (
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 border border-emerald-200">
                        <span>
                          <strong>{appliedCoupon.code}</strong> applied — {appliedCoupon.percent}% off (saved ₹{couponDiscount.toLocaleString("en-IN")})
                        </span>
                        <span className="font-bold text-emerald-700">✓</span>
                      </div>
                    ) : (
                      <>
                        <div className="mt-2 flex gap-2">
                          <Input
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value);
                              setCouponError("");
                            }}
                            placeholder={t("Enter coupon code", "कूपन कोड दर्ज करें")}
                            className="h-9 uppercase text-xs"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={applyCoupon}
                            disabled={!couponInput.trim()}
                            className="shrink-0 h-9 px-4 text-xs font-semibold"
                          >
                            {t("Apply", "लागू करें")}
                          </Button>
                        </div>
                        {couponError && (
                          <p className="mt-1.5 text-xs text-maroon">{couponError}</p>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {coupons.slice(0, 3).map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => applyCouponCode(c.code)}
                              className="rounded-full border border-maroon/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-maroon transition hover:bg-maroon hover:text-white"
                            >
                              🏷️ {c.code} · {c.percent}% {t("off", "छूट")}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ── Referral code (Optional) ───────────────────────── */}
                  <div className="sm:col-span-2 rounded-xl border border-cream-2 bg-cream/30 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-maroon">
                        🤝 {t("Partner / Referral Code (Optional)", "पार्टनर / रेफरल कोड (वैकल्पिक)")}
                      </span>
                      {referrerName && (
                        <span className="text-xs font-medium text-emerald-700">
                          ✓ {referrerName}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Input
                        value={referralCode}
                        onChange={(e) => {
                          setReferralCode(e.target.value.toUpperCase());
                        }}
                        placeholder={t("e.g. BHJ123", "जैसे BHJ123")}
                        className="h-9 uppercase text-xs"
                      />
                    </div>
                  </div>

                  {/* ── Price breakdown summary ────────────────────────── */}
                  <div className="sm:col-span-2 rounded-xl border border-maroon/10 bg-cream/20 p-4">
                    <div className="space-y-1.5 text-xs text-ink-soft">
                      <div className="flex justify-between">
                        <span>
                          {t("Items Total", "सामग्री कुल")} ({totalBoxes} {totalBoxes === 1 ? t("box", "डिब्बा") : t("boxes", "डिब्बे")}):
                        </span>
                        <span className="font-semibold text-ink">₹{totalAmount.toLocaleString("en-IN")}</span>
                      </div>
                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>{t("Coupon Discount", "कूपन छूट")} ({appliedCoupon?.code}):</span>
                          <span>-₹{couponDiscount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {referralDiscount > 0 && (
                        <div className="flex justify-between text-emerald-700 font-medium">
                          <span>{t("Referral Discount", "रेफरल छूट")}:</span>
                          <span>-₹{referralDiscount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="border-t border-cream-3 pt-2 mt-2 flex items-center justify-between text-sm">
                        <span className="font-bold text-ink">{t("Grand Total", "कुल राशि")}:</span>
                        <span className="font-display text-lg font-bold text-maroon">
                          ₹{grandTotal.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Choose Payment Method ──────────────────────────── */}
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-maroon">
                      💳 {t("Choose Payment Method", "भुगतान का तरीका चुनें")}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {razorpayKeyId && (
                        <button
                          type="button"
                          onClick={() => setPayMethod("Razorpay")}
                          className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                            payMethod === "Razorpay"
                              ? "border-maroon bg-maroon/5 ring-1 ring-maroon shadow-sm"
                              : "border-cream-3 bg-white hover:border-maroon/30"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-sm text-ink">
                              💳 {t("Pay Online", "ऑनलाइन भुगतान")}
                            </span>
                            <span className="text-xs font-bold text-maroon">
                              ₹{advanceAmount.toLocaleString("en-IN")} {t("Advance", "एडवांस")}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink-soft">
                            {t(
                              "10% advance via UPI / Cards / Netbanking with Razorpay. Balance on delivery.",
                              "10% एडवांस UPI/कार्ड से। बाकी डिलीवरी पर।",
                            )}
                          </p>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPayMethod("Connect")}
                        className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition ${
                          payMethod === "Connect"
                            ? "border-maroon bg-maroon/5 ring-1 ring-maroon shadow-sm"
                            : "border-cream-3 bg-white hover:border-maroon/30"
                        } ${!razorpayKeyId ? "sm:col-span-2" : ""}`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-sm text-ink">
                            🤝 {t("Pay on Delivery", "डिलीवरी पर भुगतान")}
                          </span>
                          <span className="text-xs font-semibold text-ink-soft">
                            {t("Connect", "कनेक्ट")}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-ink-soft">
                          {t(
                            "Our team will call to confirm order details and arrange payment.",
                            "हमारी टीम विवरण की पुष्टि और भुगतान के लिए कॉल करेगी।",
                          )}
                        </p>
                      </button>
                    </div>
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
                        ? t("Processing…", "प्रक्रिया जारी है…")
                        : payMethod === "Razorpay"
                          ? `${t("Pay Advance & Confirm", "एडवांस दें और ऑर्डर करें")} · ₹${advanceAmount.toLocaleString("en-IN")}`
                          : `${t("Confirm Order", "ऑर्डर कन्फर्म करें")} · ₹${grandTotal.toLocaleString("en-IN")}`}
                    </Button>
                    <p className="mt-2 text-center text-xs text-ink-soft">
                      {payMethod === "Razorpay"
                        ? t(
                            `₹${advanceAmount.toLocaleString("en-IN")} online advance via secure Razorpay gateway. Balance ₹${Math.max(0, grandTotal - advanceAmount).toLocaleString("en-IN")} on delivery.`,
                            `सुरक्षित रेज़रपे गेटवे से ₹${advanceAmount.toLocaleString("en-IN")} ऑनलाइन एडवांस। बाकी ₹${Math.max(0, grandTotal - advanceAmount).toLocaleString("en-IN")} डिलीवरी पर।`,
                          )
                        : t(
                            "Nothing to pay online now — our team calls to arrange payment & delivery.",
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
