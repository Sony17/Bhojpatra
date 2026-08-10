"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useSessionStatus } from "@/lib/session";
import LoginGate from "@/components/auth/LoginGate";
import StickyBookingBar from "@/components/StickyBookingBar";
import { occasions } from "@/lib/data";
import {
  cachedVenue,
  fetchVenueById,
  venueCityName,
  venueDescription,
  venueImages,
  venueSpaceOptions,
  venueQuote,
  spaceName,
  VENUE_GST_RATE,
  VENUE_ADVANCE_RATE,
  type BookableVenue,
  type VenueSpaceOption,
} from "@/lib/venues";
import { WHATSAPP_NUMBER } from "@/lib/referral";
import DatePicker from "@/components/DatePicker";
import { downloadInvoice, type InvoiceData } from "@/lib/invoice";
import {
  buildUpiUri,
  upiTxnRef,
  isValidTxnId,
  normalizeTxnId,
  DEFAULT_MERCHANT,
  type UpiPayeeConfig,
} from "@/lib/upi";
import {
  ORDER_PAYMENT_METHODS,
  ORDER_PAYMENT_LABELS,
  ORDER_PAYMENT_HINTS,
  isOnlineMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import { useVendorRatings, statFor } from "@/lib/vendorRatings";
import { StarIcon } from "@/components/reviews/reviewDisplay";
import VenueReviews from "@/components/venues/VenueReviews";
import WhatsAppShareButton from "@/components/WhatsAppShareButton";
import {
  Button,
  Card,
  Container,
  Input,
  Select,
  AppBar,
  Skeleton,
  QuantitySelector,
} from "@/components/ui";
import { controlClass } from "@/components/ui/Input";
import { money } from "@/lib/money";

/** How a guest asked to be followed up on — mirrors the leads API's whitelist. */
type VenueEnquiryTopic = "Chat" | "Call" | "Site visit";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** `YYYY-MM-DD` → "12 Dec 2026" (matches the My Bookings list style). */
function formatEventDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr || "—";
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

/** Deterministic BHJ- booking id from the venue + date + guests + the spaces
 *  booked (no random). The spaces are part of the seed so booking the hall and
 *  then the lawn for the same date lands as two orders, not one overwrite. */
function venueBookingId(
  venueId: string,
  eventDate: string,
  guests: number,
  spaceIds: string[],
  roomCount: number,
): string {
  const seed = `${venueId}|${eventDate}|${guests}|${[...spaceIds].sort().join(",")}|${roomCount}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `BHJ-${((h % 90000) + 10000).toString()}`;
}

/** Local calendar date → `YYYY-MM-DD` (never UTC — `toISOString` shifts days). */
function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

/** Today's local date as `YYYY-MM-DD`. */
function todayISO(): string {
  return isoOf(new Date());
}

type Step = "details" | "pay" | "done";

export default function VenueDetail({ id }: { id: string }) {
  const { t, lang } = useLang();
  // Paint from what we already hold — the venue the catalogue just listed, or
  // the static seed — so tapping a venue card renders the page immediately.
  // The fetch below still runs and refreshes it once the record lands.
  const [venue, setVenue] = useState<BookableVenue | null | undefined>(() =>
    cachedVenue(id),
  );

  useEffect(() => {
    let active = true;
    fetchVenueById(id).then((v) => {
      if (active) setVenue(v);
    });
    return () => {
      active = false;
    };
  }, [id]);

  if (venue === undefined) return <VenueDetailSkeleton />;

  if (venue === null) {
    return (
      <Container size="md" className="py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Venue not found", "वेन्यू नहीं मिला")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "This venue may have been removed. Browse all venues instead.",
            "यह वेन्यू हटाया जा चुका हो सकता है। सभी वेन्यू देखें।",
          )}
        </p>
        <Button href="/venues" variant="primary" size="lg" className="mt-6">
          {t("Back to Venues", "वेन्यू पर वापस")}
        </Button>
      </Container>
    );
  }

  return <VenueBooking venue={venue} t={t} lang={lang} />;
}

/**
 * Placeholder shown only when we open a venue we hold nothing for (a direct
 * link / refresh, never a tap from the catalogue). Mirrors the real layout so
 * the page doesn't jump once the record lands.
 */
function VenueDetailSkeleton() {
  return (
    <section className="app-bottom-safe mx-auto max-w-6xl sm:px-8 sm:py-6 lg:py-10">
      <div className="mb-2 flex items-center gap-3 bg-white px-4 py-3 sm:rounded-b-hero">
        <Skeleton className="h-9 w-9" rounded="full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-2/5" rounded="control" />
          <Skeleton className="h-3 w-1/3" rounded="control" />
        </div>
      </div>

      <div className="mt-2 grid gap-8 px-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr] lg:px-0">
        <div>
          <Skeleton className="aspect-[4/3] w-full rounded-hero" rounded="none" />
          <div className="mt-5 space-y-2.5">
            <Skeleton className="h-7 w-3/5" rounded="control" />
            <Skeleton className="h-3.5 w-2/5" rounded="control" />
            <Skeleton className="h-3.5 w-1/3" rounded="control" />
          </div>
          <Skeleton className="mt-5 h-24 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    </section>
  );
}

function VenueBooking({
  venue,
  t,
  lang,
}: {
  venue: BookableVenue;
  t: (en: string, hi: string) => string;
  lang: "en" | "hi";
}) {
  // Booking + payment require a signed-in guest. Tri-state: `undefined` while
  // loading, `null` signed out, object signed in — the Pay & Confirm step gates
  // on this so anonymous guests are asked to log in first.
  const sessionStatus = useSessionStatus();
  const [step, setStep] = useState<Step>("details");

  // Step 1 — event details
  const [occasionId, setOccasionId] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guests, setGuests] = useState(100);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [detailsError, setDetailsError] = useState("");

  // Photo gallery — the owner's uploaded/linked photos, cover first. A single
  // photo renders as the classic hero; more get a thumbnail strip below it.
  const photos = useMemo(() => venueImages(venue), [venue]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const heroPhoto = photos[photoIdx] ?? photos[0];

  // The venue offers several spaces at once — a banquet hall, one or more open
  // lawns (each priced on its own) and guest rooms by the night. A celebration
  // routinely takes more than one, so the selection is a *set*: every tapped
  // space turns red and adds its fee to the quote. Guest rooms are a quantity
  // instead of a card, capped at what the venue actually has.
  const spaces = useMemo(() => venueSpaceOptions(venue), [venue]);
  const bookable = useMemo(() => spaces.filter((s) => !s.subject), [spaces]);
  const roomsSpace = spaces.find((s) => s.subject);
  const maxRooms = roomsSpace?.units ?? 0;
  const [pickedIds, setPickedIds] = useState<string[]>(() =>
    bookable[0] ? [bookable[0].id] : [],
  );
  const [roomCount, setRoomCount] = useState(0);
  const togglePicked = (id: string) =>
    setPickedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  // Catalogue order, not tap order, so the summary reads the same everywhere.
  const pickedSpaces = useMemo(
    () => bookable.filter((s) => pickedIds.includes(s.id)),
    [bookable, pickedIds],
  );
  /** "Banquet Hall + Open Lawn 2 + 6 × Guest Rooms" — one line for receipts,
   *  the sticky bar and the confirmation panel. */
  const spaceSummary = useMemo(() => {
    const parts = pickedSpaces.map((s) => spaceName(s, lang));
    if (roomCount > 0 && roomsSpace) {
      parts.push(`${roomCount} × ${spaceName(roomsSpace, lang)}`);
    }
    return parts.join(" + ");
  }, [pickedSpaces, roomCount, roomsSpace, lang]);

  // Dates this venue is already taken on — the calendar paints them red so a
  // guest sees the clash before paying rather than after. Best-effort: an
  // unreachable endpoint just means no dates are flagged.
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/venues/availability?id=${encodeURIComponent(venue.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && Array.isArray(data?.dates)) setBookedDates(data.dates);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [venue.id]);

  // Step 2 — payment
  const [payMethod, setPayMethod] = useState<OrderPaymentMethod>("UPI");
  const [choice, setChoice] = useState<"advance" | "full">("advance");
  const [paidAmount, setPaidAmount] = useState(0);
  // Transaction / reference ID captured when the online payment succeeds, so it
  // travels onto the saved booking (admin console + customer's My Bookings).
  const [paidRef, setPaidRef] = useState("");
  // The transaction / UTR the customer got from their UPI app — taken before the
  // booking is confirmed so it lands on the payment record and the order.
  const [txnId, setTxnId] = useState("");
  const [merchant, setMerchant] = useState<UpiPayeeConfig>(DEFAULT_MERCHANT);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pull the live merchant VPA (admin-configurable); fall back to the default.
  useEffect(() => {
    let active = true;
    fetch("/api/admin/payment-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (active && cfg && typeof cfg.vpa === "string") {
          setMerchant({
            vpa: cfg.vpa,
            payeeName: cfg.payeeName ?? DEFAULT_MERCHANT.payeeName,
            qrImage:
              typeof cfg.qrImage === "string" ? cfg.qrImage : undefined,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  /* ── Pricing — the sum of every space the guest ticked, plus rooms ────── */
  const subtotal = venueQuote(spaces, pickedIds, roomCount) || venue.price;
  const gst = subtotal * VENUE_GST_RATE;
  const grandTotal = subtotal + gst;
  const total = Math.round(grandTotal);
  const advanceAmount = Math.max(1, Math.round(grandTotal * VENUE_ADVANCE_RATE));
  const amount = choice === "advance" ? advanceAmount : total;

  // Real, customer-submitted rating for this venue — layered over the seed
  // number for the headline badge (the reviews section below computes its own
  // live figure from the loaded list). Falls back to the seed until reviews land.
  const ratings = useVendorRatings();
  const stat = statFor(ratings, venue);
  const shownRating = stat?.rating ?? venue.rating;
  const shownCount = stat?.count ?? venue.reviews;

  const bookingId = useMemo(
    () => venueBookingId(venue.id, eventDate, guests, pickedIds, roomCount),
    [venue.id, eventDate, guests, pickedIds, roomCount],
  );

  const cityLabel = venueCityName(venue.city);
  const occasionName =
    occasions.find((o) => o.id === occasionId)?.name ?? t("Venue Booking", "वेन्यू बुकिंग");

  /* ── Invoice + receipt for this venue order ──────────────────────────── */
  const buildInvoice = (paid: number): InvoiceData => ({
    id: bookingId,
    dateLabel: formatEventDate(todayISO()),
    occasion: occasionName,
    eventDate: eventDate ? formatEventDate(eventDate) : "—",
    city: cityLabel,
    venue: venue.name,
    guests,
    packageName: `${spaceSummary} — ${t("Venue Booking", "वेन्यू बुकिंग")}`,
    // One line per booked space so the guest sees what each part cost, rather
    // than a single lump sum they can't reconcile against the cards they tapped.
    lines: [
      ...pickedSpaces.map((s) => ({
        label: `${venue.name} — ${spaceName(s, lang)} ${t("booking fee", "बुकिंग शुल्क")}`,
        amount: s.price,
      })),
      ...(roomCount > 0 && roomsSpace
        ? [
            {
              label: `${spaceName(roomsSpace, lang)} × ${roomCount} @ ${money(roomsSpace.price)}`,
              amount: roomsSpace.price * roomCount,
            },
          ]
        : []),
    ],
    menu: [],
    subtotal,
    addOnsTotal: 0,
    discount: 0,
    gst,
    grandTotal,
    paid,
  });

  const buildReceipt = (paid: number): string => {
    const balance = Math.max(0, total - paid);
    const lines = [
      "BHOJPATRA — VENUE BOOKING RECEIPT",
      `Booking ID: ${bookingId}`,
      "",
      `Venue:    ${venue.name} (${venue.type})`,
      `Spaces:   ${spaceSummary || "-"}`,
      `Location: ${[venue.location, cityLabel].filter(Boolean).join(", ")}`,
      `Occasion: ${occasionName}`,
      `Date:     ${eventDate ? formatEventDate(eventDate) : "-"}`,
      `Guests:   ${guests}`,
      ...(roomCount > 0 && roomsSpace
        ? [
            `Rooms:    ${roomCount} × ${money(roomsSpace.price)}/room (subject to availability)`,
          ]
        : []),
      "",
      `Venue Fee:   ${money(subtotal)}`,
      `GST (18%):   ${money(gst)}`,
      `Grand Total: ${money(grandTotal)}`,
      `Paid:        ${money(paid)}`,
      `Balance Due: ${money(balance)}`,
    ];
    return lines.join("\n");
  };

  /* ── Payment ─────────────────────────────────────────────────────────── */
  const txnRef = upiTxnRef(bookingId, choice === "advance" ? "ADVANCE" : "FULL");
  const note = `Bhojpatra ${bookingId}`;
  const upiUri = buildUpiUri({
    vpa: merchant.vpa,
    payeeName: merchant.payeeName,
    amount,
    note,
    txnRef,
  });
  const qrSrc =
    `/api/payments/qr?pa=${encodeURIComponent(merchant.vpa)}` +
    `&pn=${encodeURIComponent(merchant.payeeName)}` +
    `&am=${amount}&tn=${encodeURIComponent(note)}&tr=${encodeURIComponent(txnRef)}`;

  const markPaid = async () => {
    // Require the customer's transaction ID as proof before recording payment.
    if (!isValidTxnId(txnId)) {
      setPayError(
        t(
          "Enter the transaction ID from your UPI app to confirm the payment.",
          "भुगतान की पुष्टि के लिए अपने UPI ऐप से लेनदेन आईडी दर्ज करें।",
        ),
      );
      return;
    }
    const customerTxnId = normalizeTxnId(txnId);
    setPaying(true);
    setPayError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount,
          method: payMethod === "QR" ? "qr" : "upi",
          vpa: merchant.vpa,
          txnRef,
          customerTxnId,
          customer: customerName.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setPayError(
          data?.error ??
            t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
        );
        return;
      }
      setPaidAmount(amount);
      setPaidRef(customerTxnId);
    } catch {
      setPayError(
        t("Couldn't record payment. Try again.", "भुगतान दर्ज नहीं हुआ। फिर कोशिश करें।"),
      );
    } finally {
      setPaying(false);
    }
  };

  /* ── Confirm — save the booking so it shows in My Bookings + admin ────── */
  const handleConfirm = async () => {
    setConfirming(true);
    const paid = paidAmount;

    const invoiceData = buildInvoice(paid);

    // Persist to the orders backend — the single source of truth (admin console,
    // owner dashboard, the customer's My Bookings). The venue is credited back to
    // the Venue-Owner partner who listed it. The order MUST land server-side, so
    // a failure surfaces an error and keeps the guest on this step to retry.
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bookingId,
          customer: customerName.trim(),
          phone: customerPhone.trim(),
          occasion: occasionName,
          date: eventDate ? formatEventDate(eventDate) : "—",
          // Raw ISO date too — this is what the venue's availability calendar
          // reads back to paint the date red for the next customer.
          eventDateISO: eventDate || undefined,
          guests,
          vendor: venue.name,
          // The venue itself, so the order shows which halls/lawns were taken.
          venue: [venue.name, spaceSummary].filter(Boolean).join(" — "),
          // Carry the venue's catalogue identity so the order is rateable as a
          // venue from My Bookings and the review links back to this venue by id
          // (name-slug stays the fallback bridge for legacy orders).
          vendors: [{ id: venue.id, name: venue.name }],
          city: cityLabel,
          amount: total,
          paid,
          paymentMethod: payMethod,
          paymentRef: paidRef || undefined,
          status: "Confirmed",
          referralCode: venue.ownerCode || undefined,
          referrerName: venue.ownerName || undefined,
          referrerType: venue.ownerCode ? "venue" : undefined,
          receipt: buildReceipt(paid),
          invoice: invoiceData,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setPayError(
          data?.error ??
            t(
              "Couldn't confirm your booking. Please try again.",
              "आपकी बुकिंग कन्फर्म नहीं हो सकी। कृपया पुनः प्रयास करें।",
            ),
        );
        setConfirming(false);
        return;
      }
    } catch {
      setPayError(
        t(
          "Network error. Please try again.",
          "नेटवर्क त्रुटि। कृपया पुनः प्रयास करें।",
        ),
      );
      setConfirming(false);
      return;
    }

    setConfirming(false);
    setStep("done");
  };

  /** Name + phone are what every path here needs — paying, and equally the
   *  chat / call / visit hand-offs. Returns false having set the error. */
  const requireContact = (): boolean => {
    if (!customerName.trim()) {
      setDetailsError(t("Please enter your name.", "कृपया अपना नाम दर्ज करें।"));
      return false;
    }
    if (customerPhone.replace(/\D/g, "").length < 10) {
      setDetailsError(t("Please enter a valid phone number.", "कृपया सही फ़ोन नंबर दर्ज करें।"));
      return false;
    }
    return true;
  };

  const goToPay = () => {
    setDetailsError("");
    if (!pickedSpaces.length && roomCount === 0) {
      setDetailsError(
        t(
          "Tap the space (or rooms) you want to book.",
          "जो स्थान (या कमरे) बुक करना है उस पर टैप करें।",
        ),
      );
      return;
    }
    if (!eventDate) {
      setDetailsError(t("Please pick an event date.", "कृपया इवेंट की तारीख़ चुनें।"));
      return;
    }
    if (!requireContact()) return;
    setStep("pay");
  };

  const online = isOnlineMethod(payMethod);

  /* ── Catering hand-off ("Both" flows) — carry the venue into /book ───── */
  const cateringHref = (() => {
    const p = new URLSearchParams();
    p.set("venue", venue.id);
    if (venue.city) p.set("city", venue.city);
    if (occasionId) p.set("occasion", occasionId);
    if (eventDate) p.set("date", eventDate);
    if (guests) p.set("guests", String(guests));
    return `/book?${p.toString()}`;
  })();

  return (
    <>
    <section className="app-bottom-safe mx-auto max-w-6xl sm:px-8 sm:py-6 lg:py-10">
      <AppBar
        title={venue.name}
        subtitle={`${venue.location} · ${venueCityName(venue.city)}`}
        backHref="/venues"
        className="mb-2 sm:rounded-b-hero"
        trailing={
          <WhatsAppShareButton
            path={`/venues/${venue.id}`}
            message={`Check out ${venue.name} on Bhojpatra`}
            messageHi={`भोजपत्र पर ${venue.name} देखें`}
            variant="ghost"
            size="sm"
            label=""
            labelHi=""
          />
        }
      />

      <div className="mt-2 grid gap-8 px-4 md:grid-cols-2 lg:grid-cols-[1.1fr_1fr] lg:px-0">
        {/* ── Venue showcase ─────────────────────────────────────────── */}
        <div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-hero border border-maroon/6 bg-cream shadow-card">
            <Image
              key={heroPhoto}
              src={heroPhoto}
              alt={venue.name}
              fill
              priority
              sizes="(min-width: 1024px) 600px, 100vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-maroon shadow-sm backdrop-blur-sm">
              {venue.type}
            </span>
            {photos.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {photoIdx + 1} / {photos.length}
              </span>
            )}
          </div>

          {/* Thumbnail strip — only when the owner listed more than one photo. */}
          {photos.length > 1 && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  aria-label={t(`Photo ${i + 1}`, `फ़ोटो ${i + 1}`)}
                  aria-pressed={i === photoIdx}
                  className={
                    "relative h-16 w-20 shrink-0 overflow-hidden rounded-control border transition " +
                    (i === photoIdx
                      ? "border-maroon ring-2 ring-maroon"
                      : "border-cream-3 opacity-80 hover:opacity-100")
                  }
                >
                  <Image src={src} alt="" fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-3xl text-ink">{venue.name}</h1>
              {/* Rating badge — jumps to the reviews section below. */}
              <a
                href="#reviews"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-cream-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-cream-3"
              >
                <StarIcon className="h-4 w-4 text-maroon" />
                {shownRating}
                {shownCount > 0 && (
                  <span className="font-normal text-ink-soft">({shownCount})</span>
                )}
              </a>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
              <span aria-hidden="true">📍</span>
              {[venue.location, cityLabel].filter(Boolean).join(", ")}
            </p>
            {venue.capacity && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
                <span aria-hidden="true">👥</span>
                {venue.capacity}
              </p>
            )}

            <div className="mt-5 rounded-card border border-cream-3 bg-cream-2/40 p-4">
              <p className="text-xs text-ink-soft">{t("Booking fee from", "बुकिंग शुल्क")}</p>
              <p className="font-display text-2xl font-bold text-maroon">
                {venue.priceFrom}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                {t(
                  "Plus 18% GST. Pay a 10% advance to lock your date.",
                  "साथ में 18% जीएसटी। तारीख़ पक्की करने के लिए 10% एडवांस दें।",
                )}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {/* Want catering at this venue too? Carry it into the feast wizard. */}
              <Button
                href={cateringHref}
                variant="secondary"
                className="shrink-0 whitespace-nowrap"
                leftIcon={<span aria-hidden="true">🍽️</span>}
              >
                {t("Add catering for this venue", "इस वेन्यू के लिए कैटरिंग जोड़ें")}
              </Button>
              {/* Spread the word — forward this venue to friends on WhatsApp. */}
              <WhatsAppShareButton
                path={`/venues/${venue.id}`}
                variant="ghost"
                className="shrink-0 whitespace-nowrap"
                label="Share this venue"
                labelHi="यह वेन्यू शेयर करें"
                message={`Check out ${venue.name}${cityLabel ? ` in ${cityLabel}` : ""} on Bhojpatra — a ${venue.type} for your celebration, booking from ${venue.priceFrom}.`}
                messageHi={`${venue.name}${cityLabel ? `, ${cityLabel}` : ""} को Bhojpatra पर देखें — आपके उत्सव के लिए ${venue.type}, बुकिंग ${venue.priceFrom} से।`}
              />
            </div>
          </div>

          {/* Description, spaces & availability — the venue's story. The space
              cards here are the same selection the booking form uses, so
              tapping one turns it red and adds it to the order. */}
          <VenueAbout
            venue={venue}
            t={t}
            lang={lang}
            spaces={spaces}
            pickedIds={pickedIds}
            onTogglePicked={togglePicked}
            roomCount={roomCount}
            maxRooms={maxRooms}
            onRoomCount={setRoomCount}
            bookedDates={bookedDates}
          />
        </div>

        {/* ── Booking panel ──────────────────────────────────────────── */}
        <div id="venue-booking" className="scroll-mt-28 lg:sticky lg:top-32 lg:self-start">
          {step === "done" ? (
            <DonePanel
              t={t}
              bookingId={bookingId}
              venue={venue}
              spacesLabel={spaceSummary}
              eventDate={eventDate}
              guests={guests}
              cityLabel={cityLabel}
              grandTotal={grandTotal}
              paidAmount={paidAmount}
              onDownload={() => downloadInvoice(buildInvoice(paidAmount))}
            />
          ) : (
            <Card padding="none" className="p-5 sm:p-6">
              {/* Step indicator */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={
                    "rounded-full px-3 py-1 " +
                    (step === "details"
                      ? "bg-maroon text-cream"
                      : "bg-cream-2 text-ink-soft")
                  }
                >
                  1 · {t("Details", "विवरण")}
                </span>
                <span aria-hidden="true" className="text-ink-soft">→</span>
                <span
                  className={
                    "rounded-full px-3 py-1 " +
                    (step === "pay"
                      ? "bg-maroon text-cream"
                      : "bg-cream-2 text-ink-soft")
                  }
                >
                  2 · {t("Pay & Confirm", "भुगतान और पुष्टि")}
                </span>
              </div>

              {step === "details" ? (
                <div className="mt-5">
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {t("Book this venue", "यह वेन्यू बुक करें")}
                  </h2>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Your name", "आपका नाम")}
                      </span>
                      <Input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder={t("Full name", "पूरा नाम")}
                        className="mt-1.5"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Phone", "फ़ोन")}
                      </span>
                      <Input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+91 …"
                        className="mt-1.5"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Occasion", "अवसर")}
                      </span>
                      <Select
                        value={occasionId}
                        onChange={setOccasionId}
                        ariaLabel={t("Occasion", "अवसर")}
                        buttonClassName="mt-1.5"
                        options={[
                          { value: "", label: t("Select", "चुनें") },
                          ...occasions.map((o) => ({
                            value: o.id,
                            label: lang === "hi" ? o.nameHi : o.name,
                          })),
                        ]}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Guests", "मेहमान")}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        value={guests}
                        onChange={(e) => setGuests(Number(e.target.value))}
                        onBlur={(e) =>
                          setGuests(Math.max(1, Math.round(Number(e.target.value) || 1)))
                        }
                        className="mt-1.5"
                      />
                    </label>
                    <div className="block sm:col-span-2">
                      <span className="text-xs font-medium text-ink-soft">
                        {t("Event date", "इवेंट की तारीख़")}
                      </span>
                      {/* Calendar, not a bare date box — it paints this venue's
                          taken dates red so a clash is visible before paying. */}
                      <div className={`${controlClass} relative mt-1.5 px-0 py-0`}>
                        <DatePicker
                          valueIso={eventDate}
                          bookedDates={bookedDates}
                          minDaysAhead={1}
                          align="right"
                          buttonClassName="px-3.5 py-2.5 pr-10 text-sm"
                          iconClassName="right-3.5"
                          placeholder={t("Pick a date", "तारीख़ चुनें")}
                          ariaLabel={t("Event date", "इवेंट की तारीख़")}
                          onChange={(d) => setEventDate(isoOf(d))}
                        />
                      </div>
                      {bookedDates.length > 0 && (
                        <p className="mt-1.5 text-xs text-ink-soft">
                          {t(
                            "Dates shown in red are already booked at this venue.",
                            "लाल रंग में दिखी तारीख़ें इस वेन्यू पर पहले से बुक हैं।",
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Which spaces? Tap every one you want — a celebration often
                      takes the hall *and* a lawn, and each adds its own fee. */}
                  <SpacePicker
                    t={t}
                    lang={lang}
                    spaces={spaces}
                    pickedIds={pickedIds}
                    onToggle={togglePicked}
                    roomCount={roomCount}
                    maxRooms={maxRooms}
                    onRoomCount={setRoomCount}
                    className="mt-4"
                  />

                  {detailsError && (
                    <p className="mt-3 text-sm font-medium text-maroon">{detailsError}</p>
                  )}

                  <PriceBreakdown
                    t={t}
                    feeLabel={spaceSummary || t("Venue fee", "वेन्यू शुल्क")}
                    subtotal={subtotal}
                    gst={gst}
                    grandTotal={grandTotal}
                    advanceAmount={advanceAmount}
                  />

                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={goToPay}
                    rightIcon={<span aria-hidden="true">→</span>}
                    className="mt-5"
                  >
                    {t("Continue to payment", "भुगतान तक जारी रखें")}
                  </Button>

                  {/* Not everyone books off a screen. Chat, a call back, or a
                      visit with our team — all reuse the name + number above. */}
                  <EnquiryActions
                    t={t}
                    venue={venue}
                    cityLabel={cityLabel}
                    spaceSummary={spaceSummary}
                    eventDate={eventDate}
                    guests={guests}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    onNeedContact={requireContact}
                  />
                </div>
              ) : sessionStatus === undefined ? (
                /* Client session still loading — hold the panel to avoid a
                   sign-in flash before we know whether to show the gate. */
                <div className="mt-5 min-h-[18rem]" />
              ) : sessionStatus === null ? (
                /* Anonymous guest — booking + payment need a login first. The
                   entered details stay put; logging in reveals Pay & Confirm. */
                <div className="mt-5">
                  <LoginGate onBack={() => setStep("details")} />
                </div>
              ) : (
                /* ── Step 2 · Pay & confirm ─────────────────────────── */
                <div className="mt-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-ink">
                      {t("Pay & confirm", "भुगतान और पुष्टि")}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      className="text-sm font-semibold text-maroon hover:underline"
                    >
                      {t("Edit", "संपादित करें")}
                    </button>
                  </div>

                  <PriceBreakdown
                    t={t}
                    feeLabel={spaceSummary || t("Venue fee", "वेन्यू शुल्क")}
                    subtotal={subtotal}
                    gst={gst}
                    grandTotal={grandTotal}
                    advanceAmount={advanceAmount}
                  />

                  {/* Payment method */}
                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {ORDER_PAYMENT_METHODS.map((m) => {
                      const active = payMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setPayMethod(m)}
                          className={
                            "flex flex-col rounded-card border px-4 py-3 text-left transition " +
                            (active
                              ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
                              : "border-cream-3 bg-white hover:bg-cream-2")
                          }
                        >
                          <span className="text-sm font-semibold text-ink">
                            {t(ORDER_PAYMENT_LABELS[m].en, ORDER_PAYMENT_LABELS[m].hi)}
                          </span>
                          <span className="mt-0.5 text-xs text-ink-soft">
                            {t(ORDER_PAYMENT_HINTS[m].en, ORDER_PAYMENT_HINTS[m].hi)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {paidAmount > 0 ? (
                    <div className="mt-4 rounded-card border border-maroon bg-white p-4">
                      <p className="font-display text-sm font-semibold text-maroon">
                        ✓ {t("Payment received", "भुगतान प्राप्त हुआ")}: {money(paidAmount)}
                      </p>
                      {total - paidAmount > 0 && (
                        <p className="mt-1 text-xs text-ink-soft">
                          {t("Balance due:", "शेष राशि:")} {money(total - paidAmount)}{" "}
                          {t("— our team collects this later.", "— हमारी टीम बाद में लेगी।")}
                        </p>
                      )}
                    </div>
                  ) : online ? (
                    <>
                      {/* Advance vs full */}
                      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {(
                          [
                            ["advance", t("Pay 10% Advance", "10% एडवांस दें"), advanceAmount],
                            ["full", t("Pay Full", "पूरा भुगतान"), total],
                          ] as const
                        ).map(([id, label, amt]) => {
                          const active = choice === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setChoice(id)}
                              className={
                                "flex items-center justify-between gap-2 rounded-card border px-4 py-3 text-left transition " +
                                (active
                                  ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
                                  : "border-cream-3 bg-white hover:bg-cream-2")
                              }
                            >
                              <span className="text-sm font-semibold text-ink">{label}</span>
                              <span className="font-display text-sm font-semibold text-maroon">
                                {money(amt)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {payMethod === "QR" ? (
                        <div className="mt-4 flex flex-col items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={merchant.qrImage || qrSrc}
                            alt={t("UPI payment QR", "UPI भुगतान QR")}
                            width={176}
                            height={176}
                            className="h-44 w-44 rounded-control border border-cream-3 bg-white p-2 object-contain"
                          />
                          {merchant.qrImage && (
                            <p className="text-xs text-ink-soft">
                              {t(
                                `Enter ${money(amount)} in your UPI app.`,
                                `अपने UPI ऐप में ${money(amount)} दर्ज करें।`,
                              )}
                            </p>
                          )}
                          <p className="text-sm font-semibold text-ink">{merchant.vpa}</p>
                          <Button
                            href={upiUri}
                            variant="secondary"
                            size="sm"
                            className="sm:hidden"
                          >
                            {t("Open UPI app", "UPI ऐप खोलें")}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-4">
                          <p className="text-sm text-ink-soft">
                            {t("Pay to this UPI ID", "इस UPI आईडी पर भुगतान करें")}
                          </p>
                          <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar sm:flex-wrap sm:overflow-visible">
                            <span className="shrink-0 whitespace-nowrap rounded-control border border-cream-3 bg-cream-2/40 px-4 py-2 text-sm font-semibold text-ink">
                              {merchant.vpa}
                            </span>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="shrink-0 whitespace-nowrap"
                              onClick={() => {
                                navigator.clipboard?.writeText(merchant.vpa).then(
                                  () => setCopied(true),
                                  () => {},
                                );
                              }}
                            >
                              {copied ? t("Copied", "कॉपी हो गया") : t("Copy", "कॉपी")}
                            </Button>
                            <Button href={upiUri} variant="primary" size="sm" className="shrink-0 whitespace-nowrap">
                              {t("Open UPI app", "UPI ऐप खोलें")}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Transaction ID — the reference the customer's UPI app
                          shows after paying. Required before we record the
                          payment and confirm the booking. */}
                      <div className="mt-4">
                        <label
                          htmlFor="venue-upi-txn-id"
                          className="text-sm font-semibold text-ink"
                        >
                          {t("UPI Transaction ID", "UPI लेनदेन आईडी")}
                        </label>
                        <Input
                          id="venue-upi-txn-id"
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={txnId}
                          onChange={(e) => setTxnId(e.target.value)}
                          placeholder={t(
                            "12-digit UPI reference / UTR",
                            "12-अंकों का UPI रेफ़रेंस / UTR",
                          )}
                          className="mt-1.5"
                        />
                        <p className="mt-1.5 text-xs text-ink-soft">
                          {t(
                            "After paying, enter the reference number your UPI app shows so we can match your payment.",
                            "भुगतान के बाद अपने UPI ऐप में दिखने वाला रेफ़रेंस नंबर दर्ज करें ताकि हम आपका भुगतान मिला सकें।",
                          )}
                        </p>
                      </div>

                      {payError && (
                        <p className="mt-3 text-sm font-medium text-maroon">{payError}</p>
                      )}

                      <Button
                        variant="primary"
                        fullWidth
                        onClick={markPaid}
                        loading={paying}
                        disabled={paying || !isValidTxnId(txnId)}
                        className="mt-4"
                      >
                        {paying
                          ? t("Recording…", "दर्ज हो रहा है…")
                          : `${t("I've paid", "मैंने भुगतान कर दिया")} ${money(amount)}`}
                      </Button>
                      <p className="mt-2 text-xs text-ink-soft">
                        {t(
                          "Optional — you can also confirm now and pay later.",
                          "वैकल्पिक — आप अभी पुष्टि करके बाद में भी भुगतान कर सकते हैं।",
                        )}
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 rounded-card border border-cream-3 bg-cream-2/40 p-4 text-sm text-ink-soft">
                      {t(
                        "No payment now — confirm and our team will call you to arrange the most convenient way to pay.",
                        "अभी कोई भुगतान नहीं — पुष्टि करें और हमारी टीम भुगतान का सुविधाजनक तरीका तय करने के लिए कॉल करेगी।",
                      )}
                    </div>
                  )}

                  <Button
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={handleConfirm}
                    loading={confirming}
                    disabled={confirming}
                    className="mt-4"
                  >
                    {confirming
                      ? t("Confirming…", "पुष्टि हो रही है…")
                      : t("Confirm booking", "बुकिंग पुष्ट करें")}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* Mobile sticky booking bar — jumps to the booking form; hidden once the
          guest moves past the details step (payment / done). */}
      <StickyBookingBar
        price={money(subtotal)}
        priceNote={`${spaceSummary || venue.type} · +18% ${t("GST", "जीएसटी")}`}
        cta={t("Book This Venue", "यह वेन्यू बुक करें")}
        onClick={() =>
          document
            .getElementById("venue-booking")
            ?.scrollIntoView({ behavior: "smooth" })
        }
        hidden={step !== "details"}
      />
    </section>

    {/* Ratings & reviews — venue-side twin of the caterer profile's reviews. */}
    <VenueReviews venue={venue} />
    </>
  );
}

/**
 * Below-the-fold venue story: a generated description, the spaces on offer
 * (lawn / banquet hall / rooms — the last subject to availability) and an
 * availability note that points the guest at the booking form's date picker.
 */
function VenueAbout({
  venue,
  t,
  lang,
  spaces,
  pickedIds,
  onTogglePicked,
  roomCount,
  maxRooms,
  onRoomCount,
  bookedDates,
}: {
  venue: BookableVenue;
  t: (en: string, hi: string) => string;
  lang: "en" | "hi";
  spaces: VenueSpaceOption[];
  pickedIds: string[];
  onTogglePicked: (id: string) => void;
  roomCount: number;
  maxRooms: number;
  onRoomCount: (n: number) => void;
  bookedDates: string[];
}) {
  const scrollToBooking = () =>
    document
      .getElementById("venue-booking")
      ?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="mt-8 space-y-6">
      {/* About */}
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("About this venue", "इस वेन्यू के बारे में")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {venueDescription(venue, lang)}
        </p>
      </section>

      {/* Spaces — the same venue offers a banquet hall, one or more lawns and
          guest rooms. This is the *live* selection: tapping a card turns it red
          and adds it to the booking panel's order. */}
      <section>
        <h2 className="font-display text-lg font-semibold text-ink">
          {t("Spaces available", "उपलब्ध स्थान")}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {t(
            "Tap everything you want to book — pick more than one if you need it.",
            "जो कुछ बुक करना है उस पर टैप करें — ज़रूरत हो तो एक से ज़्यादा चुनें।",
          )}
        </p>
        <SpacePicker
          t={t}
          lang={lang}
          spaces={spaces}
          pickedIds={pickedIds}
          onToggle={onTogglePicked}
          roomCount={roomCount}
          maxRooms={maxRooms}
          onRoomCount={onRoomCount}
          columns={3}
          showHeading={false}
          className="mt-3"
        />
      </section>

      {/* Availability — a note tied to the booking form's date picker. */}
      <section className="rounded-card border border-cream-3 bg-cream-2/30 p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-lg leading-none">
            📅
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              {t("Availability", "उपलब्धता")}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {bookedDates.length > 0
                ? t(
                    `${bookedDates.length} date${bookedDates.length === 1 ? " is" : "s are"} already taken here — the booking calendar shows those in red. Everything else is open; your space and date are locked once you pay the 10% advance.`,
                    `यहाँ ${bookedDates.length} तारीख़ें पहले से बुक हैं — बुकिंग कैलेंडर में वे लाल दिखती हैं। बाकी सब खुली हैं; 10% एडवांस देते ही आपका स्थान और तारीख़ पक्की हो जाती है।`,
                  )
                : t(
                    "Popular dates fill fast — your space and date are locked once you pay the 10% advance. Guest rooms are subject to availability. Pick your event date in the booking form to reserve.",
                    "लोकप्रिय तारीख़ें जल्दी भर जाती हैं — 10% एडवांस देते ही आपका स्थान और तारीख़ पक्की हो जाती है। अतिथि कक्ष उपलब्धता के अधीन हैं। आरक्षित करने के लिए बुकिंग फ़ॉर्म में अपनी तारीख़ चुनें।",
                  )}
            </p>
            <button
              type="button"
              onClick={scrollToBooking}
              className="mt-2 text-sm font-semibold text-maroon hover:underline"
            >
              {t("Check your date →", "अपनी तारीख़ जाँचें →")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * The venue's spaces as a multi-select. Every hall/lawn is its own card the
 * guest toggles — a wedding routinely takes the banquet hall *and* a lawn, so
 * this is a set, not a radio group. A selected card goes red, matching how the
 * rest of the app marks an active choice.
 *
 * Guest rooms are the exception: the customer wants "six rooms", not "room 3",
 * so they get a quantity stepper capped at the venue's inventory instead.
 */
function SpacePicker({
  t,
  lang,
  spaces,
  pickedIds,
  onToggle,
  roomCount,
  maxRooms,
  onRoomCount,
  columns = 2,
  showHeading = true,
  className = "",
}: {
  t: (en: string, hi: string) => string;
  lang: "en" | "hi";
  spaces: VenueSpaceOption[];
  pickedIds: string[];
  onToggle: (id: string) => void;
  roomCount: number;
  maxRooms: number;
  onRoomCount: (n: number) => void;
  columns?: 2 | 3;
  showHeading?: boolean;
  className?: string;
}) {
  const bookable = spaces.filter((s) => !s.subject);
  const roomsSpace = spaces.find((s) => s.subject);

  return (
    <div className={className}>
      {showHeading && (
        <span className="text-xs font-medium text-ink-soft">
          {t("Choose your spaces", "अपने स्थान चुनें")}
        </span>
      )}
      <div
        className={
          "grid gap-2.5 " +
          (showHeading ? "mt-1.5 " : "") +
          (columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")
        }
      >
        {bookable.map((s) => {
          const active = pickedIds.includes(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(s.id)}
              className={
                "flex items-center justify-between gap-2 rounded-card border px-4 py-3 text-left transition " +
                (active
                  ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
                  : "border-cream-3 bg-white hover:bg-cream-2")
              }
            >
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                <span aria-hidden="true">{s.icon}</span>
                <span className="truncate">{spaceName(s, lang)}</span>
              </span>
              <span className="shrink-0 font-display text-sm font-semibold text-maroon">
                {money(s.price)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Guest rooms — a count, not a card. Still confirmed by our team, so the
          "subject to availability" caveat stays on the quote. */}
      {roomsSpace && maxRooms > 0 && (
        <div
          className={
            "mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-card border p-3 transition " +
            (roomCount > 0
              ? "border-maroon bg-maroon-soft/30 ring-2 ring-maroon"
              : "border-cream-3 bg-cream-2/30")
          }
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              <span aria-hidden="true">{roomsSpace.icon}</span>{" "}
              {maxRooms} {spaceName(roomsSpace, lang)}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">
              {t(
                `${money(roomsSpace.price)} / room · subject to availability`,
                `${money(roomsSpace.price)} / कमरा · उपलब्धता के अधीन`,
              )}
            </p>
          </div>
          <QuantitySelector
            value={roomCount}
            onChange={onRoomCount}
            min={0}
            max={maxRooms}
            size="sm"
            label={t("Rooms", "कमरे")}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The three ways to reach us instead of paying online — chat, a call, or a
 * visit to the venue with our team. Each records a lead (so nobody who asked
 * gets lost) and then hands off: WhatsApp, the dialler, or a confirmation that
 * we'll ring back to fix a time.
 */
function EnquiryActions({
  t,
  venue,
  cityLabel,
  spaceSummary,
  eventDate,
  guests,
  customerName,
  customerPhone,
  onNeedContact,
}: {
  t: (en: string, hi: string) => string;
  venue: BookableVenue;
  cityLabel: string;
  spaceSummary: string;
  eventDate: string;
  guests: number;
  customerName: string;
  customerPhone: string;
  onNeedContact: () => boolean;
}) {
  const [sending, setSending] = useState<VenueEnquiryTopic | "">("");
  const [sentVisit, setSentVisit] = useState(false);

  /** What our team needs to pick up the conversation, in one line. */
  const summary = [
    `${venue.name}${cityLabel ? `, ${cityLabel}` : ""}`,
    spaceSummary,
    eventDate ? formatEventDate(eventDate) : "",
    guests ? `${guests} ${t("guests", "मेहमान")}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  /** Record the enquiry so it reaches the team even if the hand-off is a
   *  deep link we can't follow up on. Best-effort: never blocks the hand-off. */
  const record = async (topic: VenueEnquiryTopic) => {
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "venue-enquiry",
          phone: customerPhone,
          topic,
          note: `${customerName.trim()} — ${summary}`,
        }),
      });
    } catch {
      /* offline — the deep links below still work */
    }
  };

  const run = async (topic: VenueEnquiryTopic, handoff?: () => void) => {
    if (!onNeedContact()) return;
    setSending(topic);
    await record(topic);
    setSending("");
    if (handoff) handoff();
    else setSentVisit(true);
  };

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi Bhojpatra, I'd like to book ${summary}. My name is ${customerName.trim() || "—"}.`,
  )}`;

  const actions: {
    topic: VenueEnquiryTopic;
    icon: string;
    label: string;
    handoff?: () => void;
  }[] = [
    {
      topic: "Chat",
      icon: "💬",
      label: t("Chat", "चैट"),
      handoff: () => window.open(waHref, "_blank", "noopener,noreferrer"),
    },
    {
      topic: "Call",
      icon: "📞",
      label: t("Call", "कॉल"),
      handoff: () => {
        window.location.href = `tel:+${WHATSAPP_NUMBER}`;
      },
    },
    { topic: "Site visit", icon: "🏛️", label: t("Visit", "विज़िट") },
  ];

  return (
    <div className="mt-5 border-t border-cream-3 pt-4">
      <p className="text-sm font-semibold text-ink">
        {t("Rather talk to us first?", "पहले हमसे बात करना चाहेंगे?")}
      </p>
      <p className="mt-0.5 text-xs text-ink-soft">
        {t(
          "Chat, get a call back, or visit the venue with our team — we'll use the name and number above.",
          "चैट करें, कॉल बैक लें, या हमारी टीम के साथ वेन्यू देखने जाएँ — हम ऊपर दिया नाम और नंबर इस्तेमाल करेंगे।",
        )}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {actions.map((a) => (
          <button
            key={a.topic}
            type="button"
            disabled={sending !== ""}
            onClick={() => run(a.topic, a.handoff)}
            className="focus-ring flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-card border border-cream-3 bg-white px-2 py-2.5 text-xs font-semibold text-ink transition hover:bg-cream-2 active:scale-95 disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-base leading-none">
              {a.icon}
            </span>
            {sending === a.topic ? t("Sending…", "भेज रहे हैं…") : a.label}
          </button>
        ))}
      </div>
      {sentVisit && (
        <p className="mt-2.5 text-xs font-medium text-maroon">
          {t(
            "✓ Visit requested — our team will call you to fix a time.",
            "✓ विज़िट का अनुरोध मिला — समय तय करने के लिए हमारी टीम कॉल करेगी।",
          )}
        </p>
      )}
    </div>
  );
}

function PriceBreakdown({
  t,
  feeLabel,
  subtotal,
  gst,
  grandTotal,
  advanceAmount,
}: {
  t: (en: string, hi: string) => string;
  /** Label for the fee row — the chosen space, e.g. "Banquet Hall fee". */
  feeLabel?: string;
  subtotal: number;
  gst: number;
  grandTotal: number;
  advanceAmount: number;
}) {
  return (
    <div className="mt-5 space-y-2 rounded-card border border-cream-3 bg-cream-2/30 p-4">
      <Row label={feeLabel || t("Venue fee", "वेन्यू शुल्क")} value={money(subtotal)} />
      <Row label={t("GST (18%)", "जीएसटी (18%)")} value={money(gst)} />
      <div className="my-1 h-px bg-cream-3" />
      <div className="flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-ink">
          {t("Grand Total", "कुल राशि")}
        </span>
        <span className="font-display text-base font-semibold text-maroon">
          {money(grandTotal)}
        </span>
      </div>
      <p className="pt-1 text-xs text-ink-soft">
        {t(
          `10% advance to lock the date: ${money(advanceAmount)}`,
          `तारीख़ पक्की करने के लिए 10% एडवांस: ${money(advanceAmount)}`,
        )}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function DonePanel({
  t,
  bookingId,
  venue,
  spacesLabel,
  eventDate,
  guests,
  cityLabel,
  grandTotal,
  paidAmount,
  onDownload,
}: {
  t: (en: string, hi: string) => string;
  bookingId: string;
  venue: BookableVenue;
  /** Everything booked, in one line — "Banquet Hall + Open Lawn 2 + 6 × Guest Rooms". */
  spacesLabel: string;
  eventDate: string;
  guests: number;
  cityLabel: string;
  grandTotal: number;
  paidAmount: number;
  onDownload: () => void;
}) {
  const balance = Math.max(0, Math.round(grandTotal) - paidAmount);
  return (
    <div className="rounded-card border border-maroon bg-white p-6 shadow-card">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-maroon-soft text-3xl">
        🎉
      </span>
      <h2 className="font-display mt-4 text-2xl font-semibold text-ink">
        {t("Venue booked!", "वेन्यू बुक हो गया!")}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t("Booking reference", "बुकिंग संदर्भ")}:{" "}
        <span className="font-semibold text-maroon">{bookingId}</span>
      </p>

      <dl className="mt-5 space-y-2 rounded-card border border-cream-3 bg-cream-2/30 p-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Venue", "वेन्यू")}</dt>
          <dd className="font-medium text-ink">{venue.name}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Spaces", "स्थान")}</dt>
          <dd className="max-w-[60%] text-right font-medium text-ink">
            {spacesLabel || "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Date", "तारीख़")}</dt>
          <dd className="font-medium text-ink">
            {eventDate ? formatEventDate(eventDate) : "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Guests", "मेहमान")}</dt>
          <dd className="font-medium text-ink">{guests}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("City", "शहर")}</dt>
          <dd className="font-medium text-ink">{cityLabel}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t("Total", "कुल")}</dt>
          <dd className="font-medium text-ink">{money(grandTotal)}</dd>
        </div>
        {paidAmount > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("Paid", "भुगतान")}</dt>
            <dd className="font-medium text-ink">{money(paidAmount)}</dd>
          </div>
        )}
        {balance > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t("Balance", "शेष")}</dt>
            <dd className="font-medium text-ink">{money(balance)}</dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-col gap-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onDownload}
          leftIcon={<span aria-hidden="true">⬇</span>}
        >
          {t("Download invoice", "इनवॉइस डाउनलोड करें")}
        </Button>
        <Button href="/bookings" variant="secondary" size="lg" fullWidth>
          {t("View in My Dashboard", "मेरे डैशबोर्ड में देखें")}
        </Button>
      </div>

      {/* Turn a happy booking into word-of-mouth — promote Bhojpatra to friends. */}
      <p className="mt-5 text-center text-xs text-ink-soft">
        {t("Loved planning with us? Tell a friend.", "हमारे साथ प्लानिंग पसंद आई? किसी दोस्त को बताएं।")}
      </p>
      <div className="mt-2 flex justify-center">
        <WhatsAppShareButton
          variant="ghost"
          size="sm"
          label="Share Bhojpatra"
          labelHi="भोजपत्र शेयर करें"
          message="I just booked my celebration on Bhojpatra — verified caterers & venues, all in one place. Plan yours:"
          messageHi="मैंने अभी Bhojpatra पर अपना उत्सव बुक किया — वेरिफाइड कैटरर और वेन्यू, सब एक जगह। आप भी प्लान करें:"
        />
      </div>
    </div>
  );
}
