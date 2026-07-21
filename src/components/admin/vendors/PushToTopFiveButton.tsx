"use client";

import { useState, type MouseEvent } from "react";
import { Button } from "@/components/ui";
import {
  pinRank,
  pushVendorToTopFive,
  removeVendorFromTopFive,
  useTopVendors,
} from "@/lib/topVendors";
import type { AdminVendor } from "@/lib/admin/types";

/**
 * Pins a vendor into the "Top 5" of the /book menu-builder vendor ribbon —
 * the admin-curated leading slots of every category roster the brand appears
 * in (matched by id, or by name slug for curated brands that don't share
 * ids). Reads the live pin list to show the vendor's current slot; the chip
 * for a pinned vendor is clickable to remove the pin again. Pushing when all
 * five slots are taken drops the oldest pin.
 */
export default function PushToTopFiveButton({
  vendor,
}: {
  vendor: AdminVendor;
}) {
  const { pins } = useTopVendors();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const brand = { id: vendor.id, name: vendor.business };
  const rank = pinRank(pins, brand);

  async function run(
    e: MouseEvent<HTMLButtonElement>,
    action: () => Promise<void>,
  ) {
    // Vendor rows navigate on click — keep the push from opening the detail.
    e.stopPropagation();
    setError(false);
    setSaving(true);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {rank >= 0 ? (
        <button
          type="button"
          title="Remove from Top 5"
          disabled={saving}
          onClick={(e) => run(e, () => removeVendorFromTopFive(brand))}
          className="focus-ring inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-maroon/10 bg-cream/40 px-3 py-1 text-xs font-semibold text-maroon transition hover:border-maroon/25 disabled:pointer-events-none disabled:opacity-50"
        >
          ★ Top 5 · #{rank + 1}
          <span aria-hidden="true">×</span>
        </button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={saving}
          onClick={(e) => run(e, () => pushVendorToTopFive(brand))}
        >
          Push to Top 5
        </Button>
      )}
      {error && (
        <span className="text-xs font-medium text-maroon">
          Couldn&apos;t save — try again.
        </span>
      )}
    </span>
  );
}
