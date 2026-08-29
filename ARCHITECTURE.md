# Bhojpatra System Architecture

> **Current Implementation Status**: Active Production / Staging Codebase  
> **Last Verified Against Code**: 2026-08-28 (Post-Batch 5 Synchronization)
> **Source of Truth**: Repository source files (`src/`, `schema.sql`, `package.json`)  

---

## 1. System Overview

Bhojpatra is an online catering and event food marketplace operating in India. It connects event hosts (customers) with verified catering specialists, street food stall operators, and traditional confectioners across four distinct service models:

1. **Feast**: Multi-course, tiered event catering (Silver, Gold, Platinum, Custom).
2. **Single Stall**: Specialized individual food carts and live counters.
3. **Live Stall**: Interactive cooking counters (integrated into the Feast flow).
4. **Baina / Baina Box**: Traditional gifting and ceremonial sweet boxes.

The application is structured as a full-stack Next.js application deploying on Vercel with Neon Serverless Postgres for data persistence, Vercel Blob for KYC document storage, and Resend for transactional email dispatch.

---

## 2. Technology & Runtime Stack

| Layer | Technology | Version | Location / Source Reference |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.2.9` | [`package.json:16`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L16) |
| **UI Library** | React / React DOM | `19.2.4` | [`package.json:18-19`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L18-L19) |
| **Language** | TypeScript | `^5` | [`package.json:30`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L30) |
| **Styling** | Tailwind CSS (PostCSS plugin) | `^4` | [`package.json:22,29`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L22) |
| **Animation** | Framer Motion | `^12.42.2` | [`package.json:15`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L15) |
| **Database Driver** | `@neondatabase/serverless` | `^1.1.0` | [`package.json:13`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L13) |
| **Storage Driver** | `@vercel/blob` | `^2.5.0` | [`package.json:14`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L14) |
| **Utilities** | `qrcode` | `^1.5.4` | [`package.json:17`](file:///c:/Users/Zeeshaan/Bhojpatra/package.json#L17) |
| **Payment Gateway** | **None** (Direct UPI QR / Intent with decoupled `Submitted` → `Settled` admin verification & Connect offline flow) | N/A | [`src/lib/upi.ts:1-7`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/upi.ts#L1-L7), [`src/app/api/payments/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/payments/route.ts) |
| **Email Gateway** | Resend REST API | Direct HTTP | [`src/lib/email.ts:1-8`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/email.ts#L1-L8) |

---

## 3. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser)"]
        CustomerUI["Customer UI\n(/, /occasions, /vendors, /venues)"]
        BookingUI["Booking Wizards\n(/book, /book/stall, /baina-box)"]
        VendorUI["Vendor Portal\n(/vendor/register, /vendor/dashboard)"]
        AdminUI["Admin Console\n(/admin/*)"]
        PartnerUI["Partner Portal\n(/partner, /partner/dashboard)"]
    end

    subgraph EdgeGate["Coarse Auth Gate"]
        Proxy["Next.js Proxy / Middleware\n(src/proxy.ts)"]
    end

    subgraph Server["Next.js Server Runtime"]
        RouteHandlers["API Route Handlers\n(src/app/api/*)"]
        AuthGuards["Authoritative Role & Ownership Guards\n(src/lib/auth.ts, object-level checks)"]
        StoreLayer["Store Abstraction\n(src/lib/store.ts)"]
        PricingEngine["Authoritative Server Pricing Engine\n(src/lib/bookingPricing.ts, tiers.ts)"]
        InvoiceEngine["Invoice Cryptography & Validation\n(src/lib/invoiceSign.ts, invoice.ts)"]
    end

    subgraph Persistence["Storage & Database Tier"]
        NeonDB[("Neon Serverless Postgres\n22 Tables (JSONB Document Store)")]
        VercelBlob[("Vercel Blob Storage\n(KYC docs & vendor/review photos)")]
    end

    subgraph External["External Services & Integrations"]
        ResendAPI["Resend Email API\n(Transactional Alerts)"]
        UpiApps["UPI Apps (GPay, PhonePe, Paytm)\n(Deep Links & Offline Settlement)"]
        WhatsAppDeepLink["WhatsApp Client\n(wa.me deep links)"]
        Nominatim["OpenStreetMap Nominatim\n(Reverse Geocoding)"]
    end

    CustomerUI --> Proxy
    BookingUI --> Proxy
    VendorUI --> Proxy
    AdminUI --> Proxy
    PartnerUI --> Proxy

    Proxy --> RouteHandlers
    RouteHandlers --> AuthGuards
    RouteHandlers --> PricingEngine
    RouteHandlers --> InvoiceEngine
    RouteHandlers --> StoreLayer

    StoreLayer --> NeonDB
    RouteHandlers --> VercelBlob
    RouteHandlers --> ResendAPI
    BookingUI -.-> UpiApps
    CustomerUI -.-> WhatsAppDeepLink
    RouteHandlers -.-> Nominatim
```

---

## 4. Directory & Module Architecture

```
Bhojpatra/
├── src/
│   ├── app/                      # Next.js App Router (pages, layouts, route handlers)
│   │   ├── api/                  # REST API endpoints (all dynamic = "force-dynamic")
│   │   │   ├── auth/             # Login, signup, session, password reset, partner-roles
│   │   │   ├── bookings/         # Booking CRUD, mine, invoice signed retrieval
│   │   │   ├── payments/         # Payment recording, settlement, UTR conflict checks
│   │   │   ├── partners/         # Referral partner directory & public allowlist lookup
│   │   │   ├── venues/           # Venue management & owner-filtered queries
│   │   │   ├── vendors/          # Vendor catalogue, onboarding applications, KYC uploads
│   │   │   ├── reviews/          # Customer reviews, moderation & photo serving
│   │   │   ├── leads/            # Inbound lead captures
│   │   │   ├── coupons/          # Promotional discounts & validation
│   │   │   ├── campaigns/        # Homepage popups & marketing banners
│   │   │   └── admin/            # Administrative stats, analytics & moderation
│   │   ├── book/                 # Multi-step customer booking wizards
│   │   ├── vendor/               # Vendor registration & dashboard
│   │   ├── partner/              # Partner registration & dashboard
│   │   └── admin/                # Platform management console
│   ├── components/               # UI components (atoms, sections, wizards, dashboards)
│   ├── lib/                      # Core domain logic, utilities, and integrations
│   │   ├── auth.ts               # Session token verification, scrypt hashing, requireRole
│   │   ├── users.ts              # User accounts, grantAccount, account union
│   │   ├── store.ts              # Neon Postgres query runner & store abstraction
│   │   ├── data.ts               # Static seed catalog, occasions, packages, cities
│   │   ├── bookingPricing.ts     # Authoritative server pricing engine, ladder, GST, advance calculation
│   │   ├── bookings.ts           # Customer booking queries & client sync
│   │   ├── invoice.ts            # Authoritative invoice data structure & signed share link helper
│   │   ├── invoiceSign.ts        # HMAC-SHA256 URL token signing & verification
│   │   ├── upi.ts                # NPCI UPI URI generation & VPA validation
│   │   ├── email.ts              # Resend REST client & alert formatting
│   │   ├── vendorMenus.ts        # Live vendor menus & dish tier management
│   │   ├── kyc.ts                # Vercel Blob KYC upload & retrieval helpers
│   │   └── rateLimit.ts          # Zero-dependency in-memory sliding window rate limiter (Batch 5)
├── public/                       # Static branding images & icons
├── schema.sql                    # Postgres schema definition (22 tables)
└── package.json                  # Dependencies, scripts, and runtime engines
```

---

## 5. Application Layers & Responsibilities

### 5.1 Client Layer (`"use client"`)
- **State Management**: Local React state (`useState`, `useReducer`), custom React context hooks (`useLang`, `useCompareTrayState`, `useBookingBarState`), and browser storage (`localStorage` for stall draft saving via [`src/lib/stallDraft.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/stallDraft.ts)).
- **Form Wizards**: Multi-step wizard controllers handling validation, pricing ladder calculations, date rules, and UPI intent deep-links.

### 5.2 Coarse Edge Gate (`src/proxy.ts`)
- Implemented as Next.js 16 middleware (`proxy` export).
- Matches protected paths: `/admin/:path*`, `/vendor/:path*`, `/partner/:path*`, `/bookings/:path*`, `/dashboard/:path*`, `/account/:path*`.
- Only checks that an HMAC-signed session cookie (`bhojpatra_session`) is syntactically valid via [`verifyCookieValue`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/cookieSign.ts#L36).
- **Does not hit the database**; redirects anonymous visitors to `/login` or `/admin/login`.

### 5.3 Server & API Layer (`src/app/api/*`)
- **Rate Limiting Layer (`src/lib/rateLimit.ts`, Batch 5)**:
  - Enforces request throttling prior to CPU-intensive cryptographic operations (e.g. `scrypt` hashing) and database queries.
  - Implemented as an in-memory sliding-window bucket store (`Map<string, RateLimitRecord>`) with bounded memory management and automatic TTL pruning.
  - Extracts and validates client IP addresses safely from trusted proxy headers (`x-real-ip`, `cf-connecting-ip`, or first valid hop in `x-forwarded-for`) with regex validation and fallback to `127.0.0.1`.
  - Protected endpoints and authoritative limits:
    - **Login (`POST /api/auth/login`)**: 5 attempts / 60s per `(IP + email target)`; 15 attempts / 60s per IP.
    - **Signup (`POST /api/auth/signup`)**: 5 requests / 10m per IP.
    - **Forgot Password (`POST /api/auth/forgot-password`)**: 3 requests / 15m per `(IP + email target)`; 10 requests / 15m per IP.
    - **Change Password (`POST /api/auth/change-password`)**: 5 attempts / 15m per authenticated user.
    - **Payment Submissions (`POST /api/payments`)**: 5 submissions / 5m per authenticated user + IP.
  - **429 Response & Headers**: Returns HTTP 429 Too Many Requests with standard RFC headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset`.
  - **Serverless Runtime Boundary**: The limiter operates within the memory scope of individual serverless/container runtimes. It provides effective best-effort protection against single-runtime brute-force bursts rather than globally coordinated distributed quota enforcement across multiple stateless serverless instances.
- **Authentication & Hashed Session Management (`src/lib/auth.ts`, Batch 5)**:
  - **Password Hashing**: Pure Node.js `crypto` with `scrypt` (parameters $N=16384, r=8, p=1$) and timing-safe verification.
  - **Hashed Session Storage (NEW-SEC-005)**: Eliminates plaintext session token storage in the database. The client cookie retains the raw token and HMAC signature (`[raw_token].[hmac_sha256]`), while the Postgres `sessions` table stores the deterministic SHA-256 derived hash `hashSessionToken(rawToken)`.
    - `createSession(user)` generates a random UUID, computes the SHA-256 hash for database insertion (`sessions.id`), and sets the signed cookie containing the raw token.
    - `getSessionUser()` extracts and verifies the raw token from the cookie, computes the SHA-256 hash, and retrieves the session row by hashed ID.
    - `destroySession()` computes the SHA-256 hash from the cookie token to remove the database row and clears the cookie.
  - **Session Revocation on Password Reset (NEW-SEC-004)**: Helper function `destroyUserSessions(userId: string)` queries active sessions and purges all records belonging to the target user. `POST /api/auth/forgot-password` executes `destroyUserSessions(user.id)` upon completing a password reset, immediately terminating all existing sessions across all browsers and devices.
- **Authoritative Role Guards**: Function [`requireRole(...roles)`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts#L138) validates the HMAC-signed session cookie against active sessions in Neon DB, checks expiration, and validates caller roles (`admin`, `vendor`, `partner`, `customer`). Collection endpoints (e.g. `GET /api/bookings`, `GET /api/payments`, `GET /api/leads`, `GET /api/vendors/applications`, `GET /api/vendors/kyc`, `GET /api/partners`) enforce `requireRole("admin")`.
- **Object-Level Resource Ownership Guards**:
  - **Bookings (`GET /api/bookings/[id]`)**: Restricts access to the authenticated customer who owns the booking (`order.userId === session.id`) or platform admins. Legacy records without `userId` are admin-only.
  - **Payments (`GET /api/payments/[id]`)**: Restricts access via the payment's associated booking (`payment.bookingId -> booking.userId === session.id`) or platform admins. Orphaned payments are admin-only.
  - **Venues (`POST /api/venues`, `PATCH /api/venues/[id]`, `DELETE /api/venues/[id]`, `GET /api/venues?owner=CODE`)**: Enforces session-based ownership via `ownerUserId` (with a verified `partnerRoles` referral code fallback for legacy venues). Mutations completely ignore client-submitted `ownerCode` and `ownerUserId` overrides. Unapproved/pending venues are only visible to the owning partner or admin.
  - **Partners (`POST /api/partners`, `POST /api/auth/partner-roles`)**: Stamps immutable `ownerUserId`, prevents cross-account overwrites of partner referral records, and verifies referral code uniqueness against the `partners` store to prevent role hijacking.
- **Authoritative Server Pricing Engine (`POST /api/bookings`)**: Enforces server-side recalculation of order amounts across Feast, Single Stall, Baina Box, and Venue bookings using catalog rates, add-on costs, service tiers, verified coupons, and referral discount rules. The client's claimed amount is verified against the server total; differences $> ₹1$ are rejected with HTTP 400 Bad Request.
- **Decoupled Payment Verification (`POST /api/payments`, `PATCH /api/payments/[id]`)**:
  - Customer manual UPI submissions are assigned status `"Submitted"` (never `"Advance Received"`).
  - Duplicate UTR reuse across bookings is rejected with HTTP 409 Conflict.
  - Only payments marked `"Settled"` or `"Advance Received"` by an authorized admin contribute to `order.paid`.
  - Bookings with manual payments in `"Submitted"` state are created as `"Pending"` with `paid = 0`. Admin settlement via `PATCH /api/payments/[id]` auto-reconciles the linked booking, crediting verified `paid` and promoting `order.status` to `"Confirmed"` when the advance requirement (25%) is met.
  - The `"Connect"` payment method preserves its operational workflow, creating an immediately `"Confirmed"` booking with `paid = 0`.
- **Invoice Integrity & Signed Access (`GET /api/bookings/[id]/invoice`, `src/lib/invoiceSign.ts`)**:
  - Invoices are synthesized authoritatively on the server, pinned to `order.amount` and verified `order.paid`. Client invoice overrides are ignored.
  - Public invoice sharing uses HMAC-SHA256 signed URLs (`/bookings/invoice?id=BHJ-xxxxx&sig=...`). Endpoint `GET /api/bookings/[id]/invoice` verifies the cryptographic signature or validates that the caller is the booking owner or platform admin, rejecting unsigned or tampered requests with HTTP 403 Forbidden.
- **EMI Auto-Credit Removal (`PATCH /api/bookings/[id]`)**: Eliminated customer auto-credit (`next.paid = order.amount`). Customers cannot transition a booking from `"Pending"` to `"Confirmed"` unless verified ledger payments satisfy the required advance.
- **Customer Review Submission Authorization (`POST /api/reviews`)**:
  - Requires authenticated customer authorization via `requireRole("customer")`.
  - Verifies booking existence against the Neon Postgres `bookings` store (rejecting non-existent orders with HTTP 404 Not Found).
  - Enforces booking ownership server-side (`order.userId === session.id` or email fallback for legacy orders; rejecting non-owners with HTTP 403 Forbidden).
  - Enforces review eligibility requiring `order.status === "Completed"` (rejecting reviews on `Pending`, `Confirmed`, or `Cancelled` orders with HTTP 400 Bad Request).
  - Authoritatively derives `occasion` and `city` context from the trusted order record, completely ignoring client overrides.
  - Preserves in-place composite review updates (`${bookingId}:${vendorKey}`) without duplicating records.
- **Signup Partner Role Validation (`POST /api/auth/signup`)**:
  - Validates `partnerRoles` payload structure and role types (`planner`, `individual`, `venue`).
  - Enforces standard referral code format (`/^REF-[A-Z0-9-]+$/i`).
  - Queries the authoritative `partners` store to prevent unauthorized referral code claims: permits unclaimed/fresh codes for legitimate partner registrations, but strictly blocks attackers from claiming referral codes belonging to existing partners with HTTP 403 Forbidden.
- **Dynamic Handlers**: All routes declare `export const dynamic = "force-dynamic"` to bypass Next.js static caching.

### 5.4 Data Persistence Layer (`src/lib/store.ts`)
- Uses `@neondatabase/serverless` with HTTP connection pooling.
- **Architecture Pattern**: Document-Store on Relational Postgres. Each record is stored in `data jsonb` with `id text primary key` and `seq bigint generated always as identity`.
- Implements `createStore<T>({ table, idField })` providing `list()`, `get(id)`, `upsert(record)`, `upsertMany(records)`, and `remove(id)`.
- Implements singletons via the `settings` key/value table.

### 5.5 Public vs. Private Data Taxonomy
- **Public Data**:
  - Marketplace catalog (`/`, `/occasions`, `/vendors`, `/venues`), published caterer profiles, dish menus, and approved venue listings.
  - Published customer reviews (`GET /api/reviews`): Excludes reviews hidden by admin moderation.
  - Public referral partner lookup (`GET /api/partners?code=...` & `GET /api/partners/[code]`): returns strictly allowlisted `PublicPartner` (`code`, `name`, `type`, `businessName`), with `phone`, `email`, `gst`, `createdAt`, `deleted`, and `ownerUserId` stripped.
  - Cryptographically Signed Invoices (`GET /api/bookings/[id]/invoice?sig=...`): Accessible publicly only when accompanied by a valid HMAC-SHA256 signature matching the booking ID.
- **Authenticated Data**:
  - Claiming fresh partner roles (`POST /api/auth/partner-roles`).
  - Active session resolution (`GET /api/auth/session`).
- **Owner-Only Data**:
  - Single booking details (`GET /api/bookings/[id]`).
  - Customer booking history (`GET /api/bookings/mine`).
  - Review submission and editing for completed bookings (`POST /api/reviews`).
  - Single payment transaction details (`GET /api/payments/[id]`).
  - Partner private/pending venue management (`GET /api/venues?owner=CODE`, `PATCH /api/venues/[id]`, `DELETE /api/venues/[id]`).
  - Partner profile settings (`POST /api/partners`).
- **Admin-Only Data**:
  - Administrative collections: `GET /api/bookings`, `GET /api/payments`, `GET /api/leads`, `GET /api/vendors/applications`, `GET /api/vendors/kyc`, `GET /api/partners`.
  - Raw vendor KYC document downloads (`GET /api/vendors/kyc/[id]`).
  - Legacy or orphaned records without identifiable user ownership.

---

## 6. External Services & Environment Dependencies

| Variable | Scope | Purpose | Status in Code |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Private | Neon Postgres connection string | **Required** ([`store.ts:48-53`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/store.ts#L48-L53)) |
| `BLOB_READ_WRITE_TOKEN` | Private | Vercel Blob access token for KYC & photos | **Optional / Required for Uploads** ([`kyc.ts:16`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/kyc.ts#L16)) |
| `SESSION_SECRET` | Private | HMAC key for signing session cookies | **Required in Prod** ([`cookieSign.ts:18`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/cookieSign.ts#L18)) |
| `RESEND_API_KEY` | Private | Resend REST API key for transactional emails | **Optional** (falls back to silent console log) |
| `ALERT_EMAIL_TO` | Private | Destination emails for owner alerts | **Optional** (defaults to owner emails) |
| `ALERT_EMAIL_FROM` | Private | Verified sender email for Resend | **Optional** (defaults to onboarding sender) |
| `SITE_URL` | Private | Base URL for invoice links in emails | **Optional** (defaults to Vercel production URL) |
| `ADMIN_EMAIL` | Private | Initial admin user email for auto-seed | **Optional** (defaults to `admin@bhojpatra.local` in dev) |
| `ADMIN_PASSWORD_HASH` | Private | Pre-computed scrypt hash for bootstrap admin | **Optional in dev** |
| `ADMIN_PASSWORD` | Private | Dev plaintext password hashed on the fly | Dev only ([`auth.ts:187`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts#L187)) |
| `GOOGLE_MAPS_API_KEY` | Private | Geocoding API key | Optional ([`detectedLocation.ts:50`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/detectedLocation.ts#L50)) |
| `NOMINATIM_USER_AGENT` | Private | User agent for OpenStreetMap reverse geocoding | Optional |
| `RAZORPAY_KEY_ID` | N/A | Razorpay API Key | `[NOT IMPLEMENTED]` |
| `RAZORPAY_KEY_SECRET`| N/A | Razorpay Secret | `[NOT IMPLEMENTED]` |

---

## 7. Current Architectural Discrepancies

1. **Database Fallback Claims**:
   - [`SETUP-DATABASE.md:7-8`](file:///c:/Users/Zeeshaan/Bhojpatra/SETUP-DATABASE.md#L7-L8) states: *"Until the two env vars below are set, the app silently falls back to the old JSON files (fine for next dev)."*
   - **Actual Implementation**: [`src/lib/store.ts:6-9,48-53`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/store.ts#L6-L9) explicitly forbids file fallback: *"There is NO file fallback: if no connection string is configured the first query throws a clear error rather than silently persisting to an ephemeral disk."*
2. **Razorpay Payment Gateway**:
   - System design documentation mentions Razorpay integration.
   - **Actual Implementation**: **Zero references to Razorpay exist in the codebase**. Payment is handled exclusively via manual UPI QR / intent links and customer UTR submission ([`src/lib/upi.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/upi.ts), [`src/app/api/payments/route.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/payments/route.ts)).
3. **WhatsApp Integration**:
   - No server-side WhatsApp Cloud API or Meta Business Webhook exists. WhatsApp is implemented purely via client-side `wa.me/${WHATSAPP_NUMBER}` deep links ([`src/components/FloatingChat.tsx:17-20`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/FloatingChat.tsx#L17-L20)).
