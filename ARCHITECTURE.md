# Bhojpatra System Architecture

> **Current Implementation Status**: Active Production / Staging Codebase  
> **Last Verified Against Code**: 2026-08-26  
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
| **Payment Gateway** | **None** (Direct UPI QR / Intent only) | N/A | [`src/lib/upi.ts:1-7`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/upi.ts#L1-L7) |
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
        AuthGuards["Authoritative Role Guards\n(src/lib/auth.ts)"]
        StoreLayer["Store Abstraction\n(src/lib/store.ts)"]
        PricingEngine["Pricing & Tiers Engine\n(src/lib/bookingPricing.ts, tiers.ts)"]
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
│   ├── proxy.ts                  # Next.js 16 coarse authentication middleware
│   ├── app/                      # Next.js App Router root
│   │   ├── (auth)/               # Route group: login, signup, forgot/reset password
│   │   ├── account/              # User settings, profile, password, roles
│   │   ├── admin/                # 20+ Admin dashboard sub-routes
│   │   ├── api/                  # 70 REST API route endpoints
│   │   ├── baina-box/            # Baina Box marketplace & brand storefronts
│   │   ├── book/                 # Feast (/book) and Single Stall (/book/stall) wizards
│   │   ├── bookings/             # My Bookings customer dashboard & invoice viewer
│   │   ├── dashboard/            # Unified multi-role portal (Customer/Vendor/Partner)
│   │   ├── partner/              # Partner pitch & referral partner dashboard
│   │   ├── vendor/               # Vendor registration wizard & vendor dashboard
│   │   ├── vendors/              # Public vendor catalog, profile, and menu pages
│   │   ├── venues/               # Venue catalog & venue detail pages
│   │   ├── layout.tsx            # Global HTML shell & root styling
│   │   ├── page.tsx              # Public marketplace landing page
│   │   └── globals.css           # Tailwind 4 theme & Bhojpatra brand tokens
│   ├── components/               # React UI Components
│   │   ├── admin/                # Admin management views, tables, sidebars
│   │   ├── auth/                 # LoginGate, login/signup forms
│   │   ├── booking/              # BookingWizard, StallBookingWizard, shared checkout
│   │   ├── ui/                   # Core atomic design primitives (Button, Chip, Modal)
│   │   ├── vendor/               # MenuBuilder, VendorRegister
│   │   └── vendors/              # BainaBoxOrderPanel, VendorProfile, VendorCatalog
│   └── lib/                      # Core Business Logic & Data Stores
│       ├── auth.ts               # scrypt password hashing & session management
│       ├── cookieSign.ts         # HMAC-SHA256 cookie signing
│       ├── store.ts              # Neon Postgres query runner & store abstraction
│       ├── data.ts               # Static seed catalog, occasions, packages, cities
│       ├── bookingPricing.ts     # Pricing ladder, GST, advance calculation
│       ├── bookings.ts           # Customer booking queries & client sync
│       ├── upi.ts                # NPCI UPI URI generation & VPA validation
│       ├── email.ts              # Resend REST client & alert formatting
│       ├── vendorMenus.ts        # Live vendor menus & dish tier management
│       └── kyc.ts                # Vercel Blob KYC upload & retrieval helpers
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
- **Authentication**: Pure Node.js `crypto` with `scrypt` password hashing and opaque session tokens stored in the `sessions` table ([`src/lib/auth.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts)).
- **Authoritative Authorization**: Function [`requireRole(...roles)`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/auth.ts#L138) checks cookie signature, fetches live session from Neon DB, checks expiration, and validates user roles (`admin`, `vendor`, `partner`, `customer`).
- **Dynamic Handlers**: All routes declare `export const dynamic = "force-dynamic"` to bypass Next.js static caching.

### 5.4 Data Persistence Layer (`src/lib/store.ts`)
- Uses `@neondatabase/serverless` with HTTP connection pooling.
- **Architecture Pattern**: Document-Store on Relational Postgres. Each record is stored in `data jsonb` with `id text primary key` and `seq bigint generated always as identity`.
- Implements `createStore<T>({ table, idField })` providing `list()`, `get(id)`, `upsert(record)`, `upsertMany(records)`, and `remove(id)`.
- Implements singletons via the `settings` key/value table.

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
