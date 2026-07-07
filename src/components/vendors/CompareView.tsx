"use client";

import Image from "next/image";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { vendorListings, cities, type VendorListing } from "@/lib/data";
import { useCompare } from "@/lib/compare";
import {
  useVendorRatings,
  statFor,
  type VendorRatings,
} from "@/lib/vendorRatings";

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

/** Deep-link into the booking wizard's vendor step, pre-filtered to the city. */
function bookHref(vendor: VendorListing): string {
  const cityId = cities.find((c) => c.name === vendor.city)?.id;
  return `/book?${cityId ? `city=${cityId}&` : ""}step=menu`;
}

export default function CompareView() {
  const { t } = useLang();
  const localize = useLocalize();
  const { ids, remove, clear } = useCompare();
  const ratings = useVendorRatings();

  // Resolve picks to listings in selection order.
  const vendors = ids
    .map((id) => vendorListings.find((v) => v.id === id))
    .filter((v): v is VendorListing => Boolean(v));

  if (vendors.length === 0) {
    return (
      <section className="mx-auto max-w-5xl px-5 py-16 text-center">
        <h1 className="font-display text-2xl text-ink">
          {t("Nothing to compare yet", "तुलना के लिए कुछ नहीं")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {t(
            "Add caterers to compare them side-by-side.",
            "कैटरर को साथ-साथ तुलना करने के लिए जोड़ें।",
          )}
        </p>
        <Link
          href="/vendors"
          className="mt-6 inline-block rounded-full bg-maroon px-6 py-3 text-sm font-semibold text-cream shadow-sm transition hover:bg-maroon-dark"
        >
          {t("Browse caterers", "कैटरर ब्राउज़ करें")}
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink sm:text-3xl">
            {t("Compare Caterers", "कैटरर की तुलना")}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {t(
              `Comparing ${vendors.length} caterers side-by-side.`,
              `${vendors.length} कैटरर की साथ-साथ तुलना।`,
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/vendors"
            className="rounded-full border border-maroon px-4 py-2 text-sm font-semibold text-maroon transition hover:bg-maroon/5"
          >
            + {t("Add more", "और जोड़ें")}
          </Link>
          <button
            type="button"
            onClick={clear}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-maroon"
          >
            {t("Clear all", "सभी हटाएं")}
          </button>
        </div>
      </div>

      {vendors.length < 2 && (
        <p className="mt-4 rounded-2xl border border-dashed border-cream-3 bg-cream-2/40 p-4 text-sm text-ink-soft">
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

      <div className="mt-4 overflow-x-auto rounded-2xl border border-cream-3 sm:mt-6">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {/* Sticky corner label */}
              <th className="sticky left-0 z-10 min-w-[5rem] border-b border-r border-cream-3 bg-white p-2.5 text-left align-bottom sm:min-w-[8.5rem] sm:p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Caterer", "कैटरर")}
                </span>
              </th>
              {vendors.map((v) => (
                <th
                  key={v.id}
                  className="min-w-[8.5rem] border-b border-cream-3 bg-white p-2.5 align-top sm:min-w-[13rem] sm:p-4"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => remove(v.id)}
                      aria-label={t(`Remove ${v.name}`, `${v.name} हटाएं`)}
                      className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-cream-2 text-ink-soft transition-colors hover:bg-cream-3 hover:text-maroon"
                    >
                      <span aria-hidden="true" className="leading-none">×</span>
                    </button>
                    <span className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream-2">
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
                      className="mt-2.5 block font-display text-sm font-semibold text-ink hover:text-maroon sm:mt-3 sm:text-base"
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
              render={(v) => <span className="text-ink">{v.tiers.map(localize).join(", ")}</span>}
            />
            <Row
              label={t("Cuisines", "व्यंजन")}
              vendors={vendors}
              render={(v) => <span className="text-ink">{v.cuisines.join(", ")}</span>}
            />
            <Row
              label={t("Diet", "डाइट")}
              vendors={vendors}
              render={(v) => <span className="text-ink">{localize(v.diet)}</span>}
            />
            <Row
              label={t("Serves", "परोसता है")}
              vendors={vendors}
              render={(v) => (
                <span className="text-ink">{v.mealTypes.map(localize).join(" · ")}</span>
              )}
            />
            <Row
              label={t("Verified", "वेरिफाइड")}
              vendors={vendors}
              render={(v) =>
                v.verified ? (
                  <span className="font-semibold text-maroon">✓ {t("Verified", "वेरिफाइड")}</span>
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
                    <Link
                      href={bookHref(v)}
                      className="rounded-full bg-maroon px-3 py-2 text-center text-xs font-semibold text-cream shadow-sm transition hover:bg-maroon-dark sm:px-4"
                    >
                      {t("Book", "बुक करें")}
                    </Link>
                    <Link
                      href={`/vendors/${v.id}`}
                      className="rounded-full border border-maroon px-3 py-2 text-center text-xs font-semibold text-maroon transition hover:bg-maroon/5 sm:px-4"
                    >
                      {t("View", "देखें")}
                    </Link>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
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
        <td key={v.id} className="border-b border-cream-3 p-2.5 align-top sm:p-4">
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
      <span aria-hidden="true" className="text-gold">⭐</span>
      <span className="font-semibold">{rating}</span>
      <span className="text-ink-soft">
        ({count}
        {stats ? ` ${t("verified", "सत्यापित")}` : ""})
      </span>
    </span>
  );
}
