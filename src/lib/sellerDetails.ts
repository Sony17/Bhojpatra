/**
 * A vendor's "Sold by" details as customers see them at checkout — business
 * name, city, GSTIN and FSSAI licence (what the E-Commerce Rules 2020 and
 * FSSAI's e-commerce guidance expect a marketplace to show).
 *
 * PAN and Aadhaar are deliberately NOT here: they are KYC for admin review and
 * payouts, never a customer surface — so they are dropped at this projection
 * and never reach the client payload.
 *
 * Derived at read time from the vendor's application: only an application the
 * admin has Verified contributes, and only documents that are themselves
 * Verified. A number the vendor edited after approval drops back to Pending
 * and disappears from checkout until the admin re-checks it — so a customer
 * never sees an unverified number. Client-safe (no store imports).
 */

export interface SellerDetails {
  /** Registered business name the details belong to. */
  name: string;
  /** "City, State" the vendor operates from. */
  location?: string;
  gstin?: string;
  fssai?: string;
}

/** The slice of an application this reads (structural, so it stays free of
 *  the store-backed `vendorApplications` module). */
interface ApplicationLike {
  business: string;
  status: string;
  city?: string;
  state?: string;
  documents: { kind: string; number: string; status: string }[];
}

export function sellerDetailsFrom(
  app: ApplicationLike | null | undefined,
  name?: string,
): SellerDetails | undefined {
  if (!app || app.status !== "Verified") return undefined;
  const num = (kind: string) => {
    const d = app.documents.find((x) => x.kind === kind);
    return d && d.status === "Verified" && d.number && d.number !== "Uploaded"
      ? d.number
      : undefined;
  };
  const gstin = num("GST");
  const fssai = num("FSSAI");
  const location = [app.city, app.state].map((s) => s?.trim()).filter(Boolean).join(", ");
  if (!gstin && !fssai) return undefined;
  return {
    name: name || app.business,
    ...(location ? { location } : {}),
    ...(gstin ? { gstin } : {}),
    ...(fssai ? { fssai } : {}),
  };
}
