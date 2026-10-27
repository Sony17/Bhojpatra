/**
 * Onboarding → approval → go-live rules (pure helpers, no database):
 * submission validation, the one-application-per-account upsert, badge grants,
 * moderation transitions and the published view of a live vendor.
 *
 * Run with `npx tsx --test src/lib/vendorOnboarding.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { sellerDetailsFrom } from "@/lib/sellerDetails";
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
  feastTiersOf,
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
  panNumber: "AAACH7409R",
  aadhaarNumber: "234567890124",
  fssaiNumber: "12345678901234",
  payout: {
    holderName: "Kabir Foods",
    accountNumber: "50100123456789",
    ifsc: "HDFC0001234",
    accountType: "Current",
  },
  docIds: { gst: "KYC-AAAA1111" },
};

const PAYOUT = {
  holderName: "Kabir Foods",
  accountNumber: "50100123456789",
  ifsc: "HDFC0001234",
  accountType: "Current",
};

/* ── Submission validation ─────────────────────────────────────────────── */

test("parseSubmissionIdentity validates phone, GSTIN, PAN, Aadhaar and 14-digit FSSAI", () => {
  const ok = parseSubmissionIdentity({
    ownerName: " Kabir ",
    phone: "+91 98765 43210",
    gstNumber: "09aaach7409r1zz",
    panNumber: "aaach 7409r",
    aadhaarNumber: "2345 6789 0124",
    fssaiNumber: "12345678901234",
    payout: { ...PAYOUT, ifsc: "hdfc 0001234", upiId: " kabir@okhdfcbank " },
    docIds: { gst: "KYC-AAAA1111", junk: "x" },
  });
  assert.ok(ok.ok);
  assert.equal(ok.value.phone, "9876543210");
  assert.equal(ok.value.gstNumber, "09AAACH7409R1ZZ");
  assert.equal(ok.value.panNumber, "AAACH7409R");
  assert.equal(ok.value.aadhaarNumber, "234567890124");
  assert.deepEqual(ok.value.docIds, { gst: "KYC-AAAA1111" });
  assert.equal(ok.value.payout?.ifsc, "HDFC0001234");
  assert.equal(ok.value.payout?.upiId, "kabir@okhdfcbank");

  const base = { ownerName: "Kabir", phone: "9876543210", gstNumber: "09AAACH7409R1ZZ", panNumber: "AAACH7409R", aadhaarNumber: "234567890124", fssaiNumber: "12345678901234", payout: PAYOUT };
  assert.ok(parseSubmissionIdentity(base).ok);
  // Payout details are all optional, but what's entered must be well-formed.
  const noPayout = parseSubmissionIdentity({ ...base, payout: undefined });
  assert.ok(noPayout.ok && noPayout.value.payout === undefined);
  assert.equal(parseSubmissionIdentity({ ...base, payout: { ...PAYOUT, ifsc: "HDFC1001234" } }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, payout: { ...PAYOUT, accountNumber: "1234" } }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, payout: { ...PAYOUT, upiId: "not-a-vpa" } }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, panNumber: "AAACH7409" }).ok, false);
  // A well-formed PAN that isn't the one inside the GSTIN.
  assert.equal(parseSubmissionIdentity({ ...base, panNumber: "ABCDE1234F" }).ok, false);
  // Verhoeff check digit off by one; and Aadhaar never starts 0/1.
  assert.equal(parseSubmissionIdentity({ ...base, aadhaarNumber: "234567890123" }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, aadhaarNumber: "123456789012" }).ok, false);
  // Either-or: GSTIN alone, or PAN + Aadhaar alone — but not PAN or Aadhaar alone.
  const gstOnly = parseSubmissionIdentity({ ...base, panNumber: "", aadhaarNumber: "" });
  assert.ok(gstOnly.ok);
  assert.equal(gstOnly.value.panNumber, "");
  assert.ok(parseSubmissionIdentity({ ...base, gstNumber: "" }).ok);
  assert.equal(parseSubmissionIdentity({ ...base, gstNumber: "", aadhaarNumber: "" }).ok, false);
  assert.equal(parseSubmissionIdentity({ ...base, gstNumber: "", panNumber: "" }).ok, false);
  // Without a GSTIN there's nothing for the PAN to match against.
  assert.ok(parseSubmissionIdentity({ ...base, gstNumber: "", panNumber: "ABCDE1234F" }).ok);
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
  assert.deepEqual(app.documents.map((d) => d.kind), ["GST", "PAN", "Aadhaar", "FSSAI", "Bank Account"]);
  assert.equal(app.documents.find((d) => d.kind === "Bank Account")?.number, "50100123456789 · HDFC0001234");
  assert.equal(app.payoutAccount?.ifsc, "HDFC0001234");
  assert.equal(app.documents.find((d) => d.kind === "Aadhaar")?.number, "234567890124");
  assert.deepEqual(app.cateringCategories, ["full-catering"]);
  assert.equal(app.history?.[0].action, "submitted");
  assert.equal(applicationStage(app), "pending");
});

test("Feast tiers are requested only when the vendor chose Full Catering", () => {
  // Regression (Open Idea, 2026-10-27): a Single Stall-only vendor was given
  // price-derived Silver/Gold, which later switched Feast on by itself.
  const stallOnly = buildApplication({
    existing: null,
    id: "VND-STALL",
    vendor: vendor({ serviceCategories: ["single-stall"], priceFrom: 120 }),
    identity: IDENTITY,
    owner: OWNER,
    now: NOW,
  });
  assert.deepEqual(stallOnly.requestedTiers, []);
  const feast = buildApplication({ existing: null, id: "VND-FEAST", vendor: vendor({ priceFrom: 120 }), identity: IDENTITY, owner: OWNER, now: NOW });
  assert.deepEqual(feast.requestedTiers, ["Silver", "Gold"]);
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
    panNumber: "aaach7409r",
    aadhaarNumber: "2345-6789-0124",
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
    panNumber: "AAACH7409R",
    aadhaarNumber: "234567890124",
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

/* ── Checkout "Sold by" details ────────────────────────────────────────── */

test("sellerDetailsFrom shows only verified GSTIN/FSSAI, never PAN or Aadhaar", () => {
  const app = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  // Pending application → nothing reaches a customer.
  assert.equal(sellerDetailsFrom(app), undefined);
  const verified = {
    ...app,
    status: "Verified" as const,
    documents: app.documents.map((d) => (d.kind === "FSSAI" ? d : { ...d, status: "Verified" as const })),
  };
  const LOCATION = [app.city, app.state].filter(Boolean).join(", ");
  assert.deepEqual(sellerDetailsFrom(verified), {
    name: app.business,
    ...(LOCATION ? { location: LOCATION } : {}),
    gstin: "09AAACH7409R1ZZ",
  });
  // PAN + Aadhaar alone (no GSTIN) are KYC only → no customer card at all.
  const panOnly = { ...verified, documents: verified.documents.filter((d) => d.kind !== "GST") };
  assert.equal(sellerDetailsFrom(panOnly), undefined);
});

test("switching from GSTIN to PAN + Aadhaar drops the GST document", () => {
  const first = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: { ...IDENTITY, panNumber: "", aadhaarNumber: "" }, owner: OWNER, now: NOW });
  assert.deepEqual(first.documents.filter((d) => ["GST", "PAN", "Aadhaar"].includes(d.kind)).map((d) => d.kind), ["GST"]);
  assert.equal(first.panNumber, undefined);
  const verified = { ...first, status: "Verified" as const };
  const again = buildApplication({ existing: verified, id: "x", vendor: vendor(), identity: { ...IDENTITY, gstNumber: "" }, owner: OWNER, now: NOW });
  assert.deepEqual(again.documents.filter((d) => ["GST", "PAN", "Aadhaar"].includes(d.kind)).map((d) => d.kind), ["PAN", "Aadhaar"]);
  assert.equal(again.history?.at(-1)?.note, "KYC details changed");
});

test("payout documents appear only for what the vendor gave", () => {
  const kinds = (identity: SubmissionIdentity) =>
    buildApplication({ existing: null, id: "VND-P", vendor: vendor(), identity, owner: OWNER, now: NOW })
      .documents.map((d) => d.kind);
  assert.ok(!kinds({ ...IDENTITY, payout: undefined }).some((k) => k === "Bank Account" || k === "UPI"));
  const qrOnly = buildApplication({
    existing: null,
    id: "VND-Q",
    vendor: vendor(),
    identity: { ...IDENTITY, payout: undefined, docIds: { upiQr: "KYC-QR000001" } },
    owner: OWNER,
    now: NOW,
  });
  const upi = qrOnly.documents.find((d) => d.kind === "UPI");
  assert.equal(upi?.number, "QR code");
  assert.equal(upi?.docId, "KYC-QR000001");
  assert.equal(qrOnly.upiQrDocId, "KYC-QR000001");
  assert.ok(!qrOnly.documents.some((d) => d.kind === "Bank Account"));
});

test("GST rate goes live at once — never stuck behind an older approved snapshot", () => {
  const live = vendor({ moderation: "Approved", verified: true });
  // Changing only the GST rate is not a content edit: no re-queue.
  const rated = { ...live, gstRate: 5 as const };
  assert.equal(nextModerationState(live, rated, true).moderation, "Approved");
  // A pending edit whose snapshot predates the GST picker (no rate) — the
  // reported bug: customers saw 18% although the vendor had picked 5%.
  const edited = { ...rated, about: "New about text" };
  const state = nextModerationState(rated, edited, true);
  assert.equal(state.moderation, "Pending");
  const pending = { ...edited, ...state, approvedSnapshot: { ...state.approvedSnapshot! } };
  delete (pending.approvedSnapshot as { gstRate?: number }).gstRate;
  assert.equal(publishedView(pending)?.gstRate, 5);
  assert.equal(publishedView(pending)?.about, live.about); // content still waits for review
});

/* ── Post-approval edits: re-review, GST gate, change labels ───────────── */

test("GST bills only on an admin-verified GSTIN; curated seeds keep the default", async () => {
  const { effectiveGstRateOf } = await import("@/lib/vendorMenus");
  const app = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  const v = vendor({ gstRate: 5 });
  // Submitted but not yet verified → No GST, whatever they picked.
  assert.equal(effectiveGstRateOf([app], v), 0);
  const verified = { ...app, status: "Verified" as const, documents: app.documents.map((d) => ({ ...d, status: "Verified" as const })) };
  assert.equal(effectiveGstRateOf([verified], v), 5);
  // A changed GSTIN awaiting re-review stops billing GST until re-checked.
  const changed = buildApplication({ existing: verified, id: "x", vendor: vendor(), identity: { ...IDENTITY, gstNumber: "09AAACH7409R2ZY" }, owner: OWNER, now: NOW });
  assert.equal(effectiveGstRateOf([changed], v), 0);
  // No application at all (e.g. a typed-in GSTIN never submitted) → No GST.
  assert.equal(effectiveGstRateOf([], v), 0);
  assert.equal(effectiveGstRateOf([], { gstRate: undefined }), 18);
  // Never picked a rate (listings from before the picker): grandfathered 18%.
  assert.equal(effectiveGstRateOf([changed], vendor()), 18);
});

test("a live vendor's KYC change flags re-review; an identical re-save logs nothing", async () => {
  const { needsReReview } = await import("@/lib/admin/types");
  const first = buildApplication({ existing: null, id: "VND-1", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  const verified = { ...first, status: "Verified" as const, documents: first.documents.map((d) => ({ ...d, status: "Verified" as const })) };
  assert.equal(needsReReview(verified), false);
  const same = buildApplication({ existing: verified, id: "x", vendor: vendor(), identity: IDENTITY, owner: OWNER, now: NOW });
  assert.deepEqual(same.history, verified.history);
  assert.equal(needsReReview(same), false);
  const fssai = buildApplication({ existing: verified, id: "x", vendor: vendor(), identity: { ...IDENTITY, fssaiNumber: "99999999999999" }, owner: OWNER, now: NOW });
  assert.equal(needsReReview(fssai), true);
  assert.equal(fssai.status, "Verified"); // stays live
  assert.equal(fssai.history?.at(-1)?.note, "KYC details changed");
});

test("changedPublicFields names what a pending edit changes, ignoring the GST rate", async () => {
  const { changedPublicFields, toPublishedSnapshot } = await import("@/lib/vendorMenus");
  const live = vendor({ moderation: "Approved", verified: true });
  const snap = toPublishedSnapshot(live);
  assert.deepEqual(
    changedPublicFields(snap, { ...live, about: "Fresh text", priceFrom: live.priceFrom + 50 }).sort(),
    ["About", "Starting price"],
  );
  assert.deepEqual(changedPublicFields(snap, { ...live, gstRate: 5 }), []);
});

test("feastTiersOf: no Feast bands for a vendor who didn't choose Full Catering", () => {
  // Stray tiers on a Single Stall-only record never reach the Feast rosters.
  assert.deepEqual(feastTiersOf(vendor({ serviceCategories: ["single-stall"], tiers: ["Silver", "Gold"] })), []);
  assert.deepEqual(feastTiersOf(vendor({ serviceCategories: ["full-catering"], tiers: ["Gold"] })), ["Gold"]);
  // Nothing declared (seeds, legacy) keeps the price-derived default.
  assert.deepEqual(feastTiersOf(vendor({ serviceCategories: undefined, priceFrom: 900 })), ["Silver", "Gold"]);
});
