/**
 * Item-level moderation marks (admin-disapproved Single Stalls and dishes).
 * Kept free of server imports so the admin console and the vendor dashboard
 * can match dishes to their marks; the filtering itself lives in
 * vendorMenus.ts (`applyContentReview`).
 */

/** An admin's "disapproved" mark on one Single Stall or one dish. */
export interface ContentRejection {
  /** Shown to the vendor on their dashboard. */
  reason?: string;
  at: string;
}

/** Item-level moderation layered under the vendor-wide status: approving a
 *  vendor's menu publishes everything EXCEPT the stalls and dishes disapproved
 *  here, and an Approved vendor can lose a single stall or dish without the
 *  rest of their listing going down. Marks stick across vendor edits until an
 *  admin approves the item again. Applied by {@link publishedView}. */
export interface VendorContentReview {
  /** Disapproved Single Stalls, keyed by stall category id
   *  (`stallConfig.categories[]`). */
  stalls?: Record<string, ContentRejection>;
  /** Disapproved dishes, keyed by {@link dishReviewKey}. */
  dishes?: Record<string, ContentRejection>;
}

/** Key of a dish in `VendorContentReview.dishes`: the course it publishes
 *  into plus its name (case-insensitive), so the same dish name in two
 *  courses is judged separately. */
export function dishReviewKey(courseId: string, name: string): string {
  return `${courseId}:${name.trim().toLowerCase()}`;
}
