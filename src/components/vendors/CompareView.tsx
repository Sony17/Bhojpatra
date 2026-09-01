"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { cities, type VendorListing } from "@/lib/data";
import { useCompare } from "@/lib/compare";
import { useAllVendors } from "@/lib/useAllVendors";
import {
  useVendorRatings,
  statFor,
  type VendorRatings,
} from "@/lib/vendorRatings";
import { Button, EmptyState } from "@/components/ui";
import { vendorBookingHref } from "@/lib/vendorLinks";

/** Localise the small fixed vocabularies (diet / tier / meal) for display. */
function useLocalize() {
  const { t } = useLang();
  return (value: string): string => {
    switch (value) {
      case "Veg":
        return t("Veg", "वेज");
      case "Non-Veg":
        return t("Non-Veg", "नॉन-वेज");
      case "Veg & Non-Veg":
        return t("Veg & Non-Veg", "वेज और नॉन-वेज");
      case "Silver":
        return t("Silver", "सिल्वर");
      case "Gold":
        return t("Gold", "गोल्ड");
      case "Platinum":
        return t("Platinum", "प्लैटिनम");
      case "Breakfast":
        return t("Breakfast", "नाश्ता");
      case "Lunch":
        return t("Lunch", "दोपहर का भोजन");
      case "Hi-tea":
        return t("Hi-tea", "हाई-टी");
      case "Dinner":
        return t("Dinner", "रात्रि भोज");
      case "Starters":
        return t("Starters", "स्टार्टर");
      case "Main Course":
        return t("Main Course", "मुख्य व्यंजन");
      case "Desserts":
        return t("Desserts", "मिठाई");
      case "Live Counters":
        return t("Live Counters", "लाइव काउंटर");
      default:
        return value;
    }
  };
}

/** Deep-link into the vendor's dedicated booking flow, preserving vendor ID and city. */
function bookHref(vendor: VendorListing): string {
  const cityId = cities.find((c) => c.name === vendor.city)?.id;
  return vendorBookingHref(vendor, cityId);
}

export default function CompareView({
  embedded = false,
  onClose,
}: {
  /** When true, skip the standalone page chrome (used inside the tray modal). */
  embedded?: boolean;
  onClose?: () => void;
}) {
  const { t } = useLang();
  const localize = useLocalize();
  const { ids, remove, clear } = useCompare();
  const ratings = useVendorRatings();
  const allVendors = useAllVendors();

  // Resolve picks to listings in selection order (static + live).
  const vendors = ids
    .map((id) => allVendors.find((v) => v.id === id))
    .filter((v): v is VendorListing => Boolean(v));

  if (vendors.length === 0) {
    return (
      <>
        <section
          className={
            embedded
              ? "px-5 py-12"
              : "mx-auto max-w-5xl px-4 py-8 sm:px-5 sm:py-12"
          }
        >
          <EmptyState
            title={t("Nothing to compare yet", "तुलना के लिए कुछ नहीं")}
            message={t(
              "Add caterers to compare them side-by-side.",
              "कैटरर को साथ-साथ तुलना करने के लिए जोड़ें।",
            )}
            action={
              <Button href="/vendors" variant="primary" size="lg" onClick={onClose}>
                {t("Browse caterers", "कैटरर ब्राउज़ करें")}
              </Button>
            }
          />
        </section>
      </>
    );
  }

  return (
    <>
      <section
        className={
          embedded
            ? "px-4 py-6 sm:px-5 sm:py-8"
            : "mx-auto max-w-6xl px-4 py-4 sm:px-5 sm:py-10"
        }
      >
      {!embedded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <div className="hidden sm:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-maroon">
              {t("Compare", "तुलना")}
            </p>
            <p className="mt-1 text-[13px] text-ink/55">
              {t(
                `Comparing ${vendors.length} caterers side-by-side.`,
                `${vendors.length} कैटरर की साथ-साथ तुलना।`,
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button href="/vendors" variant="secondary" size="sm">
              + {t("Add more", "और जोड़ें")}
            </Button>
            <Button variant="ghost" size="sm" onClick={clear}>
              {t("Clear all", "सभी हटाएं")}
            </Button>
          </div>
        </div>
      )}

      {embedded && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {t(
              `Comparing ${vendors.length} caterers side-by-side.`,
              `${vendors.length} कैटरर की साथ-साथ तुलना।`,
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              + {t("Add more", "और जोड़ें")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clear();
                onClose?.();
              }}
            >
              {t("Clear all", "सभी हटाएं")}
            </Button>
          </div>
        </div>
      )}

      {vendors.length < 2 && (
        <p className="mt-4 rounded-card border border-dashed border-cream-3 bg-cream-2/40 p-4 text-sm text-ink-soft">
          {t(
            "Add at least one more caterer to see a side-by-side comparison.",
            "साथ-साथ तुलना देखने के लिए कम से कम एक और कैटरर जोड़ें।",
          )}
        </p>
      )}

      {vendors.length >= 3 && (
        <p className="mt-4 text-xs text-ink-soft sm:hidden">
          {t(
            "Swipe the table sideways to compare every caterer →",
            "हर कैटरर की तुलना के लिए टेबल को साइड में स्वाइप करें →",
          )}
        </p>
      )}

      <div
        className={
          embedded
            ? "mt-2 overflow-x-auto rounded-card border border-cream-3"
            : "mt-4 overflow-x-auto rounded-card border border-cream-3 sm:mt-6"
        }
      >
        <table
          className="w-full table-fixed border-collapse text-sm"
          style={{ minWidth: `calc(5.5rem + ${vendors.length} * 10rem)` }}
        >
          <colgroup>
            <col className="w-[5.5rem] sm:w-[8.5rem]" />
            {vendors.map((v) => (
              <col key={v.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {/* Sticky corner label */}
              <th className="sticky left-0 z-10 border-b border-r border-cream-3 bg-white p-2.5 text-left align-bottom sm:p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Caterer", "कैटरर")}
                </span>
              </th>
              {vendors.map((v) => (
                <th
                  key={v.id}
                  className="border-b border-cream-3 bg-white p-2.5 align-top sm:p-4"
                >
                  <div className="relative flex flex-col">
                    <button
                      type="button"
                      onClick={() => remove(v.id)}
                      aria-label={t(`Remove ${v.name}`, `${v.name} हटाएं`)}
                      className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-ink-soft transition-colors hover:bg-cream hover:text-maroon"
                    >
                      <span aria-hidden="true" className="leading-none">
                        ×
                      </span>
                    </button>
                    {/* Fixed box — table cells ignore aspect-ratio otherwise */}
                    <span className="relative block h-24 w-full overflow-hidden rounded-xl bg-cream sm:h-32">
                      <Image
                        src={v.image}
                        alt={v.name}
                        fill
                        sizes="(min-width: 640px) 208px, 40vw"
                        className="object-cover"
                      />
                    </span>
                    <Link
                      href={`/vendors/${v.id}`}
                      onClick={onClose}
                      className="mt-2.5 block min-h-[2.75rem] font-display text-sm font-semibold leading-snug text-ink hover:text-maroon sm:mt-3 sm:min-h-[3rem] sm:text-base"
                    >
                      {v.name}
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row
              label={t("Price / plate", "कीमत / प्लेट")}
              vendors={vendors}
              render={(v) => (
                <span className="font-display text-base font-semibold text-maroon">
                  ₹{v.priceFrom.toLocaleString("en-IN")}
                </span>
              )}
            />
            <Row
              label={t("Rating", "रेटिंग")}
              vendors={vendors}
              render={(v) => <RatingCell vendor={v} ratings={ratings} />}
            />
            <Row
              label={t("Location", "स्थान")}
              vendors={vendors}
              render={(v) => (
                <span className="text-ink">
                  {v.city}, {v.state}
                </span>
              )}
            />
            <Row
              label={t("Tiers", "टियर")}
              vendors={vendors}
              render={(v) => (
                <span className="text-ink">{v.tiers.map(localize).join(", ")}</span>
              )}
            />
            <Row
              label={t("Cuisines", "व्यंजन")}
              vendors={vendors}
              render={(v) => (
                <span className="text-ink">{v.cuisines.join(", ")}</span>
              )}
            />
            <Row
              label={t("Diet", "डाइट")}
              vendors={vendors}
              render={(v) => (
                <span className="text-ink">{localize(v.diet)}</span>
              )}
            />
            <Row
              label={t("Serves", "परोसता है")}
              vendors={vendors}
              render={(v) => (
                <span className="text-ink">
                  {v.mealTypes.map(localize).join(" · ")}
                </span>
              )}
            />
            <Row
              label={t("Verified", "वेरिफाइड")}
              vendors={vendors}
              render={(v) =>
                v.verified ? (
                  <span className="font-semibold text-maroon">
                    ✓ {t("Verified", "वेरिफाइड")}
                  </span>
                ) : (
                  <span className="text-ink-soft">—</span>
                )
              }
            />
            {/* CTA row */}
            <tr>
              <th className="sticky left-0 z-10 border-r border-cream-3 bg-white p-2.5 text-left align-top sm:p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Book", "बुक करें")}
                </span>
              </th>
              {vendors.map((v) => (
                <td key={v.id} className="bg-cream-2/40 p-2.5 align-top sm:p-4">
                  <div className="flex flex-col gap-2">
                    <Button
                      href={bookHref(v)}
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={onClose}
                    >
                      {t("Book", "बुक करें")}
                    </Button>
                    <Button
                      href={`/vendors/${v.id}`}
                      variant="secondary"
                      size="sm"
                      fullWidth
                      onClick={onClose}
                    >
                      {t("View", "देखें")}
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    </>
  );
}

/** One attribute row: sticky label cell + a value cell per vendor. */
function Row({
  label,
  vendors,
  render,
}: {
  label: string;
  vendors: VendorListing[];
  render: (vendor: VendorListing) => React.ReactNode;
}) {
  return (
    <tr>
      <th className="sticky left-0 z-10 border-b border-r border-cream-3 bg-white p-2.5 text-left align-top sm:p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {label}
        </span>
      </th>
      {vendors.map((v) => (
        <td
          key={v.id}
          className="border-b border-cream-3 p-2.5 align-top sm:p-4"
        >
          {render(v)}
        </td>
      ))}
    </tr>
  );
}

/** Real rating (from reviews) when present, else the seed rating. */
function RatingCell({
  vendor,
  ratings,
}: {
  vendor: VendorListing;
  ratings: VendorRatings;
}) {
  const { t } = useLang();
  const stats = statFor(ratings, vendor);
  const rating = stats?.rating ?? vendor.rating;
  const count = stats?.count ?? vendor.reviews;
  return (
    <span className="inline-flex items-center gap-1 text-ink">
      <span aria-hidden="true" className="text-gold">
        ⭐
      </span>
      <span className="font-semibold">{rating}</span>
      <span className="text-ink-soft">
        ({count}
        {stats ? ` ${t("verified", "सत्यापित")}` : ""})
      </span>
    </span>
  );
}
