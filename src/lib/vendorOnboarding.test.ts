/**
 * Onboarding → approval → go-live rules (pure helpers, no database):
 * submission validation, the one-application-per-account upsert, badge grants,
 * moderation transitions and the published view of a live vendor.
 *
 * Run with `npx tsx --test src/lib/vendorOnboarding.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationStage,
  buildApplication,
  parseSubmissionIdentity,
  validateSubmission,
  type SubmissionIdentity,
} from "@/lib/vendorOnboarding";
import {
  applyBadgeDecision,
  applyContentDecision,
  cleanOnboardingDraft,
  nextModerationState,
  publishedView,
  reviewedItems,
  stripBadgeGrants,
  validateVendorMenuInput,
  type LiveVendorRecord,
} from "@/lib/vendorMenus";
import {
  applicationForOwner,
  type VendorApplicationRecord,
} from "@/lib/vendorApplications";

const NOW = new Date("2026-10-06T10:00:00.000Z");
const OWNER = { id: "usr-1", email: "Chef@Example.com" };

function vendor(patch: Partial<LiveVendorRecord> = {}): LiveVendorRecord {
  return {
    id: "VEN-1",
    ownerUserId: OWNER.id,
    ownerEmail: "chef@example.com",
    business: "Awadh Kitchen",
    city: "Lucknow",
    state: "Uttar Pradesh",
    cuisines: ["Awadhi"],
    priceFrom: 900,
    image: "/img.jpg",
    rating: 0,
    reviews: 0,
    verified: false,
    menu: [{ categoryId: "main", perPlate: 120, items: [{ name: "Dal", diet: "veg" }] }],
    serviceCategories: ["full-catering"],
    dietaryOffering: "veg",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...patch,
  };
}

const IDENTITY: SubmissionIdentity = {
  ownerName: "Kabir",
  phone: "9876543210",
  gstNumber: "09AAACH7409R1ZZ",
  fssaiNumber: "12345678901234",
  docIds: { gst: "KYC-AAAA1111" },
};

/* ── Submission validation ─────────────────────────────────────────────── */

test("parseSubmissionIdentity validates phone, GSTIN and 14-digit FSSAI", () => {
  const ok = parseSubmissionIdentity({
    ownerName: " Kabir ",
    phone: "+91 98765 43210",
    gstNumber: "09aaach7409r1zz",
    fssaiNumber: "12345678901234",
    docIds: { gst: "KYC-AAAA1111", junk: "x" },
  });
  assert.ok(ok.ok);
  assert.equal(ok.value.phone, "9876543210");
  assert.equal(ok.value.gstNumber, "09AAACH7409R1ZZ");
  assert.deepEqual(ok.value.docIds, { gst: "KYC-AAAA1111" });

  const base = { ownerName: "Kabir", phone: "9876543210", gstNumber: "09AAACH7409R1ZZ", fssaiNumber: "12345678901234" };
  assert.equal(parseSubmissionIdentity({ ...base, phone: "12345" }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, gstNumber: "BAD" }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, fssaiNumber: "1234" }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, ownerName: "" }).ok, false);
});

test("validateSubmission requires a service, city, dietary offering and per-service basics", () => {
  assert.ok(validateSubmission(vendor()).ok);
  assert.equal(validateSubmission(vendor({ serviceCategories: [] })).ok, false);
  assert.equal(validateSubmission(vendor({ city: "" })).ok, false);
  assert.equal(validateSubmission(vendor({ dietaryOffering: undefined })).ok, false);
  assert.equal(validateSubmission(vendor({ priceFrom: 0 })).ok, false);
  assert.equal(
    validateSubmission(vendor({ serviceCategories: ["baina-box"], bainaBoxes: [] })).ok,
    false,
  );
  assert.equal(
    validateSubmission(vendor({ serviceCategories: ["single-stall"], stallConfig: { categories: [] } })).ok,
    false,
  );
});

/* ── One application per account ───────────────────────────────────────── */

test("buildApplication creates a Pending application bound to the account", () => {
  const app = buildApplication({ existing: null, id: "VND-NEW", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  assert.equal(app.id, "VND-NEW");
  assert.equal(app.ownerUserId, OWNER.id);
  assert.equal(app.email, "chef@example.com");
  assert.equal(app.status, "Pending");
  assert.equal(app.gstNumber, IDENTITY.gstNumber);
  assert.equal(app.documents.find((d) => d.kind === "GST")?.docId, "KYC-AAAA1111");
  assert.deepEqual(app.cateringCategories, ["full-catering"]);
  assert.equal(app.history?.[0].action, "submitted");
  assert.equal(applicationStage(app), "pending");
});

test("resubmitting after changes requested reuses the record and returns it to Pending", () => {
  const first = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  const rejected: VendorApplicationRecord = {
    ...first,
    status: "Rejected",
    changesRequested: true,
    reviewReason: "Wrong FSSAI",
    assignedTiers: ["Gold"],
  };
  assert.equal(applicationStage(rejected), "changes-requested");
  const again = buildApplication({
    existing: rejected,
    id: "VND-OTHER",
    vendor: vendor(),
    identity: { ...IDENTITY, fssaiNumber: "99999999999999" },
    owner: OWNER,
    now: NOW,
  });
  assert.equal(again.id, "VND-1");
  assert.equal(again.status, "Pending");
  assert.equal(again.changesRequested, undefined);
  assert.equal(again.reviewReason, undefined);
  assert.deepEqual(again.assignedTiers, ["Gold"]);
  assert.equal(again.history?.at(-1)?.action, "resubmitted");
});

test("an admin-rejected document stays Rejected until the vendor replaces it", () => {
  const first = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  const reviewed: VendorApplicationRecord = {
    ...first,
    documents: first.documents.map((d) => (d.kind === "GST" ? { ...d, status: "Rejected" } : d)),
  };
  const same = buildApplication({ existing: reviewed, id: "x", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  assert.equal(same.documents.find((d) => d.kind === "GST")?.status, "Rejected");
  const replaced = buildApplication({
    existing: reviewed,
    id: "x",
    vendor: vendor(),
    identity: { ...IDENTITY, docIds: { gst: "KYC-BBBB2222" } },
    owner: OWNER,
    now: NOW,
  });
  assert.equal(replaced.documents.find((d) => d.kind === "GST")?.status, "Pending");
});

test("a verified vendor's resubmission stays Verified", () => {
  const first = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  const again = buildApplication({ existing: { ...first, status: "Verified" }, id: "x", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  assert.equal(again.status, "Verified");
});

test("applicationForOwner matches by account, then legacy email-only rows", () => {
  const mk = (id: string, patch: Partial<VendorApplicationRecord>) =>
    ({ ...buildApplication({ existing: null, id, vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW }), ...patch }) as VendorApplicationRecord;
  const legacy = mk("VND-LEG", { ownerUserId: undefined });
  const other = mk("VND-OTH", { ownerUserId: "usr-2" });
  assert.equal(applicationForOwner([legacy, other], OWNER)?.id, "VND-LEG");
  assert.equal(applicationForOwner([other], OWNER), null);
  const bound = mk("VND-OWN", {});
  assert.equal(applicationForOwner([legacy, bound], OWNER)?.id, "VND-OWN");
});

/* ── Badges: vendors apply, admins grant ───────────────────────────────── */

test("stripBadgeGrants removes vendor self-granted badges and approvals", () => {
  const out = stripBadgeGrants({
    applied: ["icon"],
    granted: ["verified", "heritage"],
    applications: [{ badgeKey: "icon", appliedAt: "x", status: "approved" }],
  });
  assert.deepEqual(out?.granted, []);
  assert.equal(out?.applications?.[0].status, "applied");
  const check = validateVendorMenuInput({
    business: "Awadh Kitchen",
    city: "Lucknow",
    priceFrom: 900,
    menu: [],
    badges: { applied: [], granted: ["verified"] },
  });
  assert.ok(check.ok);
  assert.equal(check.value.badges, undefined);
});

test("applyBadgeDecision grants, rejects and revokes", () => {
  const applied = { applied: ["icon" as const], granted: [], applications: [{ badgeKey: "icon" as const, appliedAt: "x", status: "applied" as const }] };
  const granted = applyBadgeDecision(applied, "icon", "grant");
  assert.deepEqual(granted.granted, ["icon"]);
  assert.equal(granted.applications?.[0].status, "approved");
  assert.deepEqual(applyBadgeDecision(granted, "icon", "revoke").granted, []);
  const rejected = applyBadgeDecision(applied, "icon", "reject");
  assert.deepEqual(rejected.applied, []);
  assert.equal(rejected.applications?.[0].status, "rejected");
});

/* ── Drafts & service categories ───────────────────────────────────────── */

test("service categories are never inferred from builder content", () => {
  const check = validateVendorMenuInput({
    business: "Awadh Kitchen",
    city: "Lucknow",
    priceFrom: 900,
    menu: [],
    serviceCategories: ["full-catering"],
    bainaBoxes: [{ name: "Box", contents: "Laddu", price: 400 }],
    essentialService: { perGuest: 50, includes: ["Stewards"] },
  });
  assert.ok(check.ok);
  assert.deepEqual(check.value.serviceCategories, ["full-catering"]);
});

test("cleanOnboardingDraft keeps identity, KYC, step and gold rate; drops junk", () => {
  const draft = cleanOnboardingDraft({
    ownerName: "Kabir",
    phone: "98765 43210",
    gstNumber: "09aaach7409r1zz",
    fssaiNumber: "1234-5678-9012-34",
    docs: { gst: { id: "KYC-AAAA1111", fileName: "gst.pdf" }, fssai: { id: "../etc" } },
    step: 4,
    maxPhase: 3,
    goldRate: 1299,
  });
  assert.deepEqual(draft, {
    ownerName: "Kabir",
    phone: "9876543210",
    gstNumber: "09AAACH7409R1ZZ",
    fssaiNumber: "12345678901234",
    docs: { gst: { id: "KYC-AAAA1111", fileName: "gst.pdf" } },
    step: 4,
    maxPhase: 3,
    goldRate: 1299,
  });
  assert.equal(cleanOnboardingDraft({ step: 99 }), undefined);
});

/* ── Moderation & go-live ──────────────────────────────────────────────── */

test("nextModerationState: first save, no-op save, and live edits keep a snapshot", () => {
  assert.equal(nextModerationState(null, vendor(), true).moderation, "Approved");
  assert.equal(nextModerationState(null, vendor(), false).moderation, "Pending");

  const live = vendor({ moderation: "Approved", verified: true });
  // Wizard progress only — nothing public changed.
  const progress = nextModerationState(live, { ...live, onboarding: { step: 3 }, updatedAt: "later" }, true);
  assert.equal(progress.moderation, "Approved");

  const edited = { ...live, about: "New bio" };
  const state = nextModerationState(live, edited, true);
  assert.equal(state.moderation, "Pending");
  assert.equal(state.approvedSnapshot?.about, undefined);
  assert.equal(state.approvedSnapshot?.business, "Awadh Kitchen");

  // A second edit while pending keeps the ORIGINAL approved snapshot.
  const pending = { ...edited, ...state };
  const again = nextModerationState(pending, { ...pending, about: "Newer" }, true);
  assert.equal(again.approvedSnapshot, state.approvedSnapshot);

  // An admin takedown sticks.
  assert.equal(nextModerationState(vendor({ moderation: "Hidden" }), vendor({ about: "x" }), true).moderation, "Hidden");
});

test("publishedView shows approved content while edits wait, hides everything else", () => {
  const live = vendor({ moderation: "Approved", verified: true, rating: 4.5 });
  assert.equal(publishedView(live), live);
  const edited = { ...live, about: "Pending bio", ...nextModerationState(live, { ...live, about: "Pending bio" }, true) };
  const view = publishedView({ ...edited, rating: 4.8 });
  assert.ok(view);
  assert.equal(view.moderation, "Approved");
  assert.equal(view.about, undefined);
  assert.equal(view.rating, 4.8);
  assert.equal(view.approvedSnapshot, undefined);
  assert.equal(publishedView(vendor({ moderation: "Pending" })), null);
  assert.equal(publishedView({ ...edited, moderation: "Hidden" }), null);
  assert.equal(publishedView({ ...edited, verified: false }), null);
});

/* ── Item-level moderation: single stalls & dishes ───────────────────────── */

function stallVendor(patch: Partial<LiveVendorRecord> = {}): LiveVendorRecord {
  return vendor({
    moderation: "Approved",
    verified: true,
    menu: [
      { categoryId: "main", perPlate: 120, items: [{ name: "Dal", diet: "veg" }, { name: "Kofta", diet: "veg" }] },
      // Two custom stalls both publish into "regional"; "Thali" is in both.
      {
        categoryId: "regional",
        perPlate: 200,
        items: [
          { name: "Litti", diet: "veg" },
          { name: "Thali", diet: "veg" },
          { name: "Baati", diet: "veg" },
        ],
      },
      { categoryId: "chaat", perPlate: 90, items: [{ name: "Pani Puri", diet: "veg" }] },
    ],
    stallConfig: {
      categories: ["Bihari", "Rajasthani", "chaat"],
      menus: {
        Bihari: [{ name: "Litti", diet: "veg" }, { name: "Thali", diet: "veg" }],
        Rajasthani: [{ name: "Baati", diet: "veg" }, { name: "thali", diet: "veg" }],
        chaat: [{ name: "Pani Puri", diet: "veg" }],
      },
      categoryPricing: { chaat: { fixedPerPlate: 90, minPaxGuarantee: 50 } },
    },
    ...patch,
  });
}

const names = (r: LiveVendorRecord | null, course: string) =>
  r?.menu.find((s) => s.categoryId === course)?.items.map((i) => i.name) ?? null;

test("contentReview: a disapproved stall leaves the listing, the rest stays live", () => {
  const review = applyContentDecision(undefined, { kind: "stall", stallId: "chaat" }, "reject", " Hygiene photos ");
  assert.equal(review?.stalls?.chaat.reason, "Hygiene photos");
  const view = publishedView(stallVendor({ contentReview: review }));
  assert.equal(names(view, "chaat"), null);
  assert.deepEqual(view?.stallConfig?.categories, ["Bihari", "Rajasthani"]);
  assert.equal(view?.stallConfig?.categoryPricing?.chaat, undefined);
  assert.deepEqual(names(view, "main"), ["Dal", "Kofta"]);
  assert.equal(view?.moderation, "Approved");
});

test("contentReview: a stall sharing a course takes only its own dishes", () => {
  const review = applyContentDecision(undefined, { kind: "stall", stallId: "Bihari" }, "reject");
  const view = publishedView(stallVendor({ contentReview: review }));
  // "Litti" was only Bihari's; "Thali" is also on the Rajasthani stall.
  assert.deepEqual(names(view, "regional"), ["Thali", "Baati"]);
  assert.equal(view?.stallConfig?.menus?.Bihari, undefined);
});

test("contentReview: disapproved dishes drop out; ids keep their index", () => {
  let review = applyContentDecision(undefined, { kind: "dish", courseId: "main", name: "Dal" }, "reject");
  review = applyContentDecision(review, { kind: "dish", courseId: "regional", name: "THALI" }, "reject");
  const r = stallVendor({ contentReview: review });
  const view = publishedView(r);
  assert.deepEqual(names(view, "main"), ["Kofta"]);
  assert.deepEqual(names(view, "regional"), ["Litti", "Baati"]);
  // The same dish in the stall's own list goes too (case-insensitive).
  assert.deepEqual(view?.stallConfig?.menus?.Rajasthani.map((i) => i.name), ["Baati"]);
  // Roster ids are built from the index in the FULL section.
  assert.deepEqual(reviewedItems(r, r.menu[1])?.map((x) => x.index), [0, 2]);
  // Approving it again restores the dish; nothing left → no review at all.
  review = applyContentDecision(review, { kind: "dish", courseId: "main", name: "Dal" }, "approve");
  review = applyContentDecision(review, { kind: "dish", courseId: "regional", name: "Thali" }, "approve");
  assert.equal(review, undefined);
});

test("contentReview: reaches the approved snapshot during a pending edit and never re-queues", () => {
  const live = stallVendor();
  const pending = stallVendor({
    moderation: "Pending",
    approvedSnapshot: nextModerationState(live, { ...live, about: "new" }, true).approvedSnapshot,
    contentReview: applyContentDecision(undefined, { kind: "stall", stallId: "chaat" }, "reject"),
  });
  assert.equal(names(publishedView(pending), "chaat"), null);
  // An admin decision is not vendor content: no moderation change.
  const decided = { ...live, contentReview: pending.contentReview };
  assert.equal(nextModerationState(live, decided, true).moderation, "Approved");
});
