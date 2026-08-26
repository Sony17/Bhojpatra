# Bhojpatra Security Architecture & Observations

> **Current Implementation Status**: Active Production / Staging Codebase  
> **Last Verified Against Code**: 2026-08-26  
> **Source of Truth**: Repository source files (`src/proxy.ts`, `src/lib/auth.ts`, `src/lib/cookieSign.ts`, `src/app/api/*`)  
> **SECURITY REMEDIATION STATUS**: 
> - **Batch 1** (BHOJ-SEC-001, BHOJ-SEC-003, BHOJ-SEC-007, BHOJ-SEC-008, BHOJ-SEC-010, BHOJ-SEC-011): Admin collection access control and public-safe shaping verified fixed. Status: **Verified Fixed**.
> - **Batch 2** (BHOJ-SEC-002, BHOJ-SEC-004, BHOJ-SEC-005, BHOJ-SEC-006, BHOJ-SEC-009, NEW-SEC-001, NEW-SEC-003): Resource ownership, session identity enforcement, and client-controlled identifier mitigations across Bookings, Payments, Venues, and Partners verified fixed (66/66 automated tests passed). Status: **Verified Fixed**.

---

## 1. Security Architecture Overview

The Bhojpatra application adopts a two-tier authentication and authorization strategy:
1. **Coarse Edge Boundary (`src/proxy.ts`)**: Fast, stateless HMAC signature verification on incoming session cookies to redirect unauthenticated browser visits away from protected dashboard pages.
2. **Authoritative Server Guard (`src/lib/auth.ts`)**: State-verified database lookups and role matrix enforcement implemented within individual route handlers.

Data isolation relies almost entirely on application-level logic; because database storage uses a generic JSONB document store on Postgres, the database layer itself enforces no Row Level Security (RLS) or schema-level constraints.

---

## 2. Authentication Architecture

### 2.1 Password Hashing & Storage
- **Algorithm**: Node.js built-in `crypto.scrypt` (no external npm dependencies).
- **Parameters**: $N = 16384$, $r = 8$, $p = 1$, key length = $64$ bytes ([`src/lib/auth.ts:47-50`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts#L47-L50)).
- **Salt**: 16 cryptographically random bytes (`randomBytes(16)`).
- **Storage Format**: `scrypt$16384$8$1$[salt_base64]$[key_base64]` persisted inside `data.passwordHash` in the `users` table.
- **Verification**: Evaluated using `crypto.timingSafeEqual` to eliminate timing side-channel attacks ([`src/lib/auth.ts:72`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts#L72)).

### 2.2 Session Management
- **Token Generation**: Cryptographically strong UUID (`randomUUID()`).
- **Session Lifespan**: 30 days (`SESSION_TTL_SECONDS = 2,592,000`).
- **Cookie Mechanics**:
  - Cookie Name: `bhojpatra_session`
  - Format: `[session_token].[hmac_sha256_signature]`
  - Attributes: `httpOnly: true`, `sameSite: "lax"`, `secure: process.env.NODE_ENV === "production"`, `path: "/"`.
- **Signing Secret**: Generated from `SESSION_SECRET` environment variable (HMAC-SHA256).

---

## 3. Authorization & Role Matrix

### 3.1 Role Hierarchy & Multi-Account Architecture
Defined in [`src/lib/users.ts:14-96`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/users.ts#L14-L96):
- `admin`: Platform operators. Distinct administrative role; cannot hold customer or vendor booking accounts.
- `customer`: Universal baseline role held by all non-admin users. Allows ordering Feasts, Stalls, and Baina Boxes.
- `vendor`: Caterers and stall specialists. Grants access to the vendor dashboard and menu builder.
- `partner`: Referral partners (event planners, venue owners, individual referrers).

A single user account can hold multiple roles simultaneously via the `accounts` array (e.g. a user can be both a `customer` and a `vendor`), evaluated via [`accountsFor(user)`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/users.ts#L76).

### 3.2 Enforcement Points

| Surface Area | Gate Location | Mechanism | Enforcement Level |
| :--- | :--- | :--- | :--- |
| **Page Navigation** | [`src/proxy.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/proxy.ts) | HMAC Cookie Signature Check | Coarse (redirects unauthenticated page requests) |
| **Admin Collection APIs** | `src/app/api/bookings`, `payments`, `leads`, `vendors/applications`, `vendors/kyc`, `partners` | `requireRole("admin")` | Authoritative Role Guard (Batch 1) |
| **Single Booking Lookup** | [`src/app/api/bookings/[id]/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/bookings/%5Bid%5D/route.ts) | `requireRole()` + `order.userId === session.id` | Authoritative Resource Ownership (Batch 2) |
| **Single Payment Lookup** | [`src/app/api/payments/[id]/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/payments/%5Bid%5D/route.ts) | `requireRole()` + `booking.userId === session.id` | Authoritative Resource Ownership (Batch 2) |
| **Venue Mutations & Owner Filter** | [`src/app/api/venues/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/venues/route.ts), [`src/app/api/venues/[id]/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/venues/%5Bid%5D/route.ts) | `requireRole("partner", "admin")` + `venue.ownerUserId` | Authoritative Resource Ownership (Batch 2) |
| **Partner Management** | [`src/app/api/partners/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/partners/route.ts), [`src/app/api/auth/partner-roles/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/auth/partner-roles/route.ts) | `requireRole("partner", "admin")` + store uniqueness checks | Authoritative Resource Ownership (Batch 2) |
| **Public Partner Lookup** | [`src/app/api/partners/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/partners/route.ts) (`?code=`), `[code]` | Public-safe allowlist projection | Authoritative Public Shaping (Batch 1) |
| **Vendor Portal APIs** | [`src/app/api/vendor/*`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendor) | `requireRole("vendor")` | Authoritative Role Guard |
| **Admin Console APIs** | [`src/app/api/admin/*`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/admin) | `requireRole("admin")` | Authoritative Role Guard |
| **Database** | Postgres Engine | Application-level checks | Application-level only (no DB-level RLS) |

### 3.3 Resource Ownership Model
The system enforces explicit resource ownership across all protected domains:
1. **Bookings**: Authenticated session identity (`session.id`) is stamped onto `order.userId` at creation. Single-order lookups require `order.userId === session.id` or administrative privilege.
2. **Payments**: Payments do not record `userId` directly; ownership is derived indirectly through the linked booking (`payment.bookingId -> booking.userId === session.id`). Non-owners and unlinked/orphaned payments are denied to non-admins.
3. **Venues**: Technical authorization is governed by `venue.ownerUserId` (references `users.id`), stamped upon creation. Business/promotional attribution is tracked via `venue.ownerCode`. Legacy venues without `ownerUserId` fall back to verified `partnerRoles` referral codes. Ownership fields are immutable via PATCH.
4. **Partners**: Partner records are owned by `partner.ownerUserId`. Cross-account overwrites are rejected with HTTP 403. Referral code claiming verifies against the `partners` store to prevent role hijacking.

---

## 4. Trust Boundaries & Attack Surface Diagram

```mermaid
flowchart TD
    subgraph UntrustedZone["Untrusted Client Zone (Browser)"]
        AnonUser["Anonymous Visitor / Attacker"]
        AuthCust["Authenticated Customer"]
        AuthPartner["Authenticated Partner / Vendor"]
        AuthAdmin["Authenticated Admin"]
    end

    subgraph EdgeGate["Coarse Edge Gate"]
        Proxy["Next.js Proxy (src/proxy.ts)\nHMAC Cookie Verification"]
    end

    subgraph ServerZone["Next.js Server API Boundary"]
        AdminGuards["Admin Collection Handlers\n(requireRole('admin'))\n/api/bookings, /api/payments, /api/leads, etc."]
        OwnershipGuards["Resource Ownership Handlers\n(requireRole() + Ownership Checks)\n/api/bookings/[id], /api/payments/[id], /api/venues/[id]"]
        PartnerGuards["Partner Role & Store Guards\n/api/partners, /api/auth/partner-roles"]
        ShapedPublic["Public-Safe Shaped Handlers\n/api/partners?code=..."]
        PublicCatalog["Public Catalog Handlers\n/api/venues, /api/vendors"]
    end

    subgraph DataZone["Secure Storage Zone"]
        NeonDB[("Neon Postgres\n(data jsonb)")]
        VercelBlob[("Vercel Blob Storage\n(KYC docs & photos)")]
    end

    AnonUser -->|Public GET| PublicCatalog
    AnonUser -->|Referral Code Check| ShapedPublic
    AnonUser -.->|Unauthenticated Request| Proxy
    AnonUser -.->|Unauthenticated Request| AdminGuards
    AnonUser -.->|Unauthenticated Request| OwnershipGuards

    AuthCust -->|Cookie HTTP| OwnershipGuards
    AuthPartner -->|Cookie HTTP| PartnerGuards
    AuthPartner -->|Cookie HTTP| OwnershipGuards
    AuthAdmin -->|Cookie HTTP| AdminGuards
    AuthAdmin -->|Cookie HTTP| OwnershipGuards

    AdminGuards -->|Authorized Admin Queries| NeonDB
    AdminGuards -->|Authorized Admin Streams| VercelBlob
    OwnershipGuards -->|Owner-Verified Queries| NeonDB
    PartnerGuards -->|Claim-Verified Queries| NeonDB
    ShapedPublic -->|Allowlisted Public Projections| NeonDB
    PublicCatalog -->|Approved Public Catalog Only| NeonDB
```

---

## 5. Security-Relevant Architecture Observations (Audit Log)

> **Remediation Status**: Findings remediated in Batch 1 (commit `2eff3e7`) and Batch 2 (commit `85d9e7b`) are documented below with verified fix status and exact source references. Observations for future batches (e.g. Batch 3) are noted accordingly.

### Observation 1: Broken Object-Level Authorization (BOLA / IDOR) on Booking Lookups
- **Location**: [`src/app/api/bookings/[id]/route.ts:45-66`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/bookings/%5Bid%5D/route.ts#L45-L66)
- **Description**: `GET /api/bookings/[id]` previously contained no authentication check and no ownership verification.
- **Architectural Footgun**: Booking IDs are generated via a deterministic formula in [`src/lib/bookingPricing.ts:122-131`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/bookingPricing.ts#L122-L131) spanning predictable 5-digit values (`BHJ-10000` to `BHJ-99999`).
- **Batch 2 Remediation**: Enforced `requireRole()` authentication before database lookup. Admins may view any booking; non-admin customers may only view bookings where `order.userId === guard.id`. Legacy bookings without `userId` stay admin-only. Status: **Verified Fixed** (BHOJ-SEC-002).

### Observation 2: Unauthenticated Financial Payment Ledger Exposure & Single Payment IDOR
- **Location**: [`src/app/api/payments/route.ts:51-77`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/payments/route.ts#L51-L77) and [`src/app/api/payments/[id]/route.ts:24-52`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/payments/%5Bid%5D/route.ts#L24-L52)
- **Description**: `GET /api/payments` and `GET /api/payments/[id]` originally had no authentication or ownership requirements.
- **Batch 1 Remediation**: `GET /api/payments` enforces `requireRole("admin")` before reading from the payments store. Status: **Verified Fixed** (BHOJ-SEC-008).
- **Batch 2 Remediation**: `GET /api/payments/[id]` enforces `requireRole()`. Admins have full ledger access; non-admin customers must verify ownership via the associated booking (`order = await bookingStore.get(payment.bookingId); order.userId === guard.id`). Orphaned payments without verifiable customer ownership are denied to non-admins. Status: **Verified Fixed** (BHOJ-SEC-009).

### Observation 3: Unauthenticated Vendor KYC Document Leakage
- **Location**: [`src/app/api/vendors/kyc/route.ts:18-23`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendors/kyc/route.ts#L18-L23) and [`src/app/api/vendors/kyc/[id]/route.ts:8-36`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendors/kyc/%5Bid%5D/route.ts#L8-L36)
- **Description**: Both the KYC document metadata list (`GET /api/vendors/kyc`) and the raw document streaming endpoint (`GET /api/vendors/kyc/[id]`) were open to the public.
- **Batch 1 Remediation**: Both endpoints now enforce `requireRole("admin")` before reading document metadata or streaming file bytes. Status: **Verified Fixed** (BHOJ-SEC-003, BHOJ-SEC-010).

### Observation 4: Unauthenticated Referral Partner Directory & GST Exposure
- **Location**: [`src/app/api/partners/route.ts:41-76`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/partners/route.ts#L41-L76) and [`src/app/api/partners/[code]/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/partners/%5Bcode%5D/route.ts)
- **Description**: `GET /api/partners` previously had no role check, dumping the full partner directory when omitting `?code=`.
- **Batch 1 Remediation**: The unfiltered directory now enforces `requireRole("admin")`. Single-code lookups (`?code=...` and `/[code]`) return an explicit allowlisted `PublicPartner` (`code`, `name`, `type`, `businessName`), with `phone`, `email`, and `gst` strictly stripped for non-admin callers. Status: **Verified Fixed** (BHOJ-SEC-007, BHOJ-SEC-011).

### Observation 5: Client-Controlled Pricing & Lack of Server-Side Price Verification
- **Location**: [`src/app/api/bookings/route.ts:176-177, 196, 303-304`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/bookings/route.ts#L176-L177)
- **Description**: In `POST /api/bookings`, the server extracts `amount` and `paid` directly from the client's JSON request body and persists them:
  ```ts
  const amt = typeof amount === "number" ? amount : Number(amount);
  ...
  amount: Math.round(amt),
  paid: Number.isFinite(paidAmt) && paidAmt > 0 ? Math.round(paidAmt) : 0,
  ```
- **Impact**: The server never recalculates the menu pricing ladder based on package rates, guest count, or add-ons. A malicious client could submit a ₹50,000 banquet feast with `amount: 1` and `paid: 1`. Slated for Batch 3 (BHOJ-SEC-012).

### Observation 6: Unverified Manual UPI Settlement & Fraud Risk
- **Location**: [`src/app/api/payments/route.ts:108-116`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/payments/route.ts#L108-L116)
- **Description**: Online payments record a customer-entered transaction ID (UTR / RRN) validated only against a generic regular expression (`/^[A-Z0-9]{6,24}$/`).
- **Impact**: Without an integrated payment gateway (e.g. Razorpay) or automated bank reconciliation webhooks, bookings can be marked with arbitrary fake UTR numbers, requiring manual administrative detection against bank statements.

### Observation 7: Full Table Scans & Denial of Service (DoS) Risk
- **Location**: [`src/lib/store.ts:158-163`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/store.ts#L158-L163) and [`src/lib/users.ts:111-115`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/users.ts#L111-L115)
- **Description**: `store.list()` executes `SELECT data FROM [table] ORDER BY seq ASC` to fetch every record into memory.
- **Impact**: Every routine operation (such as logging in or verifying an email during signup via `findUserByEmail`) fetches the entire `users` table into Vercel memory and searches via JavaScript array methods. As tables grow, this creates high memory usage and latency.

### Observation 8: Insecure Development Fallbacks
- **Location**: [`src/lib/auth.ts:176-196`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts#L176-L196) and [`src/lib/cookieSign.ts:18-24`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/cookieSign.ts#L18-L24)
- **Description**:
  - When `SESSION_SECRET` is not set, a hardcoded fallback string (`"bhojpatra-dev-secret-do-not-use-in-production"`) is used to sign session cookies.
  - When `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` are not configured in non-production environments, the system automatically seeds a superadmin account with credentials `admin@bhojpatra.local` / `admin123`.
- **Impact**: If staging or preview deployments omit these variables, default admin credentials and predictable cookie signatures become active.

### Observation 9: Venue Mutations via Client-Controlled Identifiers & Owner Filter Exposure
- **Location**: [`src/app/api/venues/route.ts:57-68, 176-224`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/venues/route.ts#L57-L68) and [`src/app/api/venues/[id]/route.ts:23-38, 80-158`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/venues/%5Bid%5D/route.ts#L23-L38)
- **Description**: Venues were created, edited, and deleted relying solely on matching public promotional referral codes (`ownerCode: "REF-..."`). Furthermore, `GET /api/venues?owner=CODE` exposed unapproved/pending venues to anonymous visitors.
- **Batch 2 Remediation**: 
  - `POST /api/venues` enforces `requireRole("partner", "admin")`, validates that partners only publish under their verified `partnerRoles` referral codes, and stamps `ownerUserId: guard.id`.
  - `PATCH /api/venues/[id]` and `DELETE /api/venues/[id]` verify authenticated session identity (`guard.role === "admin" || venue.ownerUserId === guard.id || guard.partnerRoles?.some(r => r.referralCode === venue.ownerCode)`), completely eliminating reliance on body/query `ownerCode`, and disallowing mutations to ownership fields.
  - `GET /api/venues?owner=CODE` gates owner-scoped pending/unapproved venue listings to the authenticated owning partner or admin (returning 401 for anonymous and 403 for unrelated users), while preserving public catalogue visibility for approved venues.
  - Status: **Verified Fixed** (BHOJ-SEC-004, BHOJ-SEC-005, NEW-SEC-003).

### Observation 10: Partner Overwrite and Referral Role Hijacking
- **Location**: [`src/app/api/partners/route.ts:107-167`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/partners/route.ts#L107-L167) and [`src/app/api/auth/partner-roles/route.ts:18-64`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/auth/partner-roles/route.ts#L18-L64)
- **Description**: `POST /api/partners` was unauthenticated and merged incoming request payloads onto existing partner records, allowing arbitrary overwrites. Additionally, `POST /api/auth/partner-roles` attached arbitrary referral codes to user records without ownership validation.
- **Batch 2 Remediation**:
  - `POST /api/partners` enforces `requireRole("partner", "admin")`, stamps immutable `ownerUserId: guard.id`, and rejects attempts by third-party callers to overwrite existing partner codes with 403 Forbidden.
  - `POST /api/auth/partner-roles` checks `partners` store and rejects any attempt to claim another partner's referral code with HTTP 403 (`{ error: "This referral code belongs to another partner." }`).
  - Status: **Verified Fixed** (BHOJ-SEC-006, NEW-SEC-001).

---

## 6. Audit Summary

| Category | Finding | Current State | Remediation Status |
| :--- | :--- | :--- | :--- |
| **Access Control** | Unauthenticated Admin Booking List (`GET /api/bookings`) | `[ADMIN GUARD ENFORCED]` | Verified Fixed (Batch 1) |
| **Access Control** | Unauthenticated Booking Lookup (`GET /api/bookings/[id]`) | `[OWNERSHIP ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Access Control** | Unauthenticated Payment Ledger (`GET /api/payments`) | `[ADMIN GUARD ENFORCED]` | Verified Fixed (Batch 1) |
| **Access Control** | Unauthenticated Single Payment (`GET /api/payments/[id]`) | `[BOOKING-OWNER ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Access Control** | Unauthenticated KYC Document Download (`GET /api/vendors/kyc`, `[id]`) | `[ADMIN GUARD ENFORCED]` | Verified Fixed (Batch 1) |
| **Access Control** | Unauthenticated Partner Directory (`GET /api/partners`) | `[ADMIN GUARD ENFORCED]` | Verified Fixed (Batch 1) |
| **Access Control** | Partner PII/GST Exposure (`GET /api/partners?code=...`, `[code]`) | `[PUBLIC-SAFE ALLOWLIST]` | Verified Fixed (Batch 1) |
| **Access Control** | Unauthenticated Leads List (`GET /api/leads`) | `[ADMIN GUARD ENFORCED]` | Verified Fixed (Batch 1) |
| **Access Control** | Unauthenticated Vendor Applications (`GET /api/vendors/applications`) | `[ADMIN GUARD ENFORCED]` | Verified Fixed (Batch 1) |
| **Access Control** | Venue Mutation via Client `ownerCode` (`PATCH`, `DELETE /api/venues/[id]`) | `[SESSION OWNERSHIP ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Access Control** | Unauthorized Venue Creation (`POST /api/venues`) | `[ROLE & CODE CHECK ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Access Control** | Venue Exposure via Owner Param (`GET /api/venues?owner=CODE`) | `[OWNER/ADMIN GUARD ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Access Control** | Partner Record Overwrite / Hijack (`POST /api/partners`) | `[OWNER/ADMIN GUARD ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Privilege Escalation**| Partner Role Hijacking (`POST /api/auth/partner-roles`) | `[CLAIM VERIFICATION ENFORCED]` | **Verified Fixed (Batch 2)** |
| **Data Integrity** | Client-Controlled Booking Amounts | `[TRUSTS CLIENT PAYLOAD]` | Unfixed (Slated for Batch 3) |
| **Payment Integrity**| Unverified Manual UPI UTR Submission | `[MANUAL RECONCILIATION]` | Unfixed (Observation only) |
| **Performance/DoS** | Full Table Scans in Memory (`store.list`) | `[IN-MEMORY FILTERING]` | Unfixed (Observation only) |
| **Secret Hygiene** | Insecure Dev Fallback Secrets & Admin Seed | `[DEV FALLBACK ACTIVE]` | Unfixed (Observation only) |
