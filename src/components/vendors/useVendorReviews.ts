"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReviewCardData } from "@/components/vendors/ReviewCard";

/**
 * One vendor's published reviews, newest first, fetched with the server-side
 * `?vendorId=` filter (so a storefront never downloads every review on the
 * platform). Pass extra roster ids (a sample listing's bridged stall) and,
 * for curated samples ONLY, `name` to keep the seed name bridge.
 *
 * Returns the list, a `reload` for after a fresh submit, and the aggregate
 * computed from exactly that list (undefined while there are none).
 */
export function useVendorReviews({
  ids,
  name,
}: {
  ids: string[];
  name?: string;
}): {
  reviews: ReviewCardData[];
  reload: () => void;
  stat?: { rating: number; count: number };
} {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const key = ids.filter(Boolean).join("|");

  const reload = useCallback(() => {
    const sp = new URLSearchParams();
    for (const id of key.split("|")) if (id) sp.append("vendorId", id);
    if (!sp.has("vendorId")) return;
    if (name) sp.set("name", name);
    fetch(`/api/reviews?${sp.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { reviews?: ReviewCardData[] } | null) => {
        if (d?.reviews) setReviews(d.reviews);
      })
      .catch(() => {});
  }, [key, name]);

  useEffect(() => {
    reload();
  }, [reload]);

  const stat = reviews.length
    ? {
        rating:
          Math.round(
            (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) *
              10,
          ) / 10,
        count: reviews.length,
      }
    : undefined;

  return { reviews, reload, stat };
}
