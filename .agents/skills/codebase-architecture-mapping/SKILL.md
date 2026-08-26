---
name: codebase-architecture-mapping
description: Guides an AI coding agent through reverse-engineering the CURRENT implementation of the Bhojpatra project and documenting its architecture, data flows, booking flows, database ERD, and security boundaries before any security fixes or feature changes are made.
allowed-tools: run_command view_file list_dir grep_search write_to_file replace_file_content multi_replace_file_content
---

# Codebase Architecture Mapping Skill

This skill defines the operational procedure for reverse-engineering the **current** implementation of the Bhojpatra project and producing comprehensive, verified, and maintainable architecture documentation before any feature modifications or security remediations begin.

---

## 1. Core Philosophy & Operational Workflow

```
ACTUAL CODEBASE
       ↓
REVERSE ENGINEER
       ↓
     VERIFY
       ↓
      MAP
       ↓
    DOCUMENT
       ↓
  CROSS-CHECK
       ↓
      STOP
```

### The Iron Rules of Architecture Mapping

1. **Code is Ground Truth**: The source code and database schemas represent the actual system. Existing documentation (`README.md`, `CLAUDE.md`, `AGENTS.md`, design notes) provides context and intent, but **must be verified against the code**. If code and documentation disagree, document what the code actually does and explicitly note the discrepancy.
2. **Zero Code Changes**: Under no circumstances should application code, schemas, tests, or config files be modified during this process. This skill produces **documentation only**.
3. **No Unverified Assumptions**: Never assume standard framework patterns (e.g., standard Next.js conventions) are present unless confirmed in the repository.
4. **Current State vs. Planned State**: Clearly segregate features that are implemented from stubs, mock data, and planned features.
5. **Mark the Unknown**: If a flow, endpoint, or database table cannot be fully verified through code paths, tag it explicitly as `UNKNOWN / UNVERIFIED`.
6. **No Premature Fixes**: When architectural flaws, insecure patterns, or missing authorization checks are uncovered, **do not fix them**. Document them in the security architecture file as observations for future phases.

---

## 2. Systematic Codebase Inspection

Inspect the repository methodically across the following layers before writing documentation:

### Step 2.1: Project Identity & Manifest Inspection
- Inspect `package.json` to extract:
  - Framework (Next.js version, App Router vs. Pages Router)
  - Language and runtime (TypeScript / JavaScript, Node engine)
  - UI libraries (Tailwind CSS, component libraries, styling systems)
  - Database access layer (Raw PostgreSQL/MySQL, Prisma, Drizzle, Supabase client, pg driver)
  - Authentication libraries (NextAuth / Auth.js, custom JWT, cookie session, Supabase Auth)
  - External SDKs (Razorpay, WhatsApp APIs, AWS S3 / Cloudinary, Twilio, etc.)
  - State management (Zustand, Redux, React Context, TanStack Query, etc.)
- Inspect configuration files:
  - `next.config.js` / `next.config.mjs` / `next.config.ts`
  - `tsconfig.json` (path aliases such as `@/*`)
  - `middleware.ts` / `middleware.js`
  - `.env.example` or sample environment configurations (to discover expected environment variables)

### Step 2.2: Directory & Structure Reconnaissance
Inspect the filesystem systematically:
- Route trees (`app/` or `pages/` or `src/app/`, `src/pages/`)
- API endpoints (`app/api/**/route.ts` or `pages/api/**/*.ts`)
- Server Actions (`use server` directives in action files or components)
- Component hierarchy (`components/`, `src/components/`)
- Data & state layers (`data/`, `lib/`, `services/`, `store/`, `hooks/`, `utils/`)
- Public assets & uploads (`public/`, `uploads/`, `static/`)
- Database schemas & migrations (`database/`, `prisma/`, `schema.sql`, `migrations/`, `supabase/`)
- Existing documentation (`README.md`, `AGENTS.md`, `CLAUDE.md`, `SETUP-DATABASE.md`, etc.)

### Step 2.3: Call-Graph & Dependency Tracing
Trace actual connections:
- Follow imports from UI components to their data sources.
- Trace form submissions to API routes or Server Actions.
- Trace API routes and actions to database queries and external service clients.
- Trace database queries back to the physical database schema (`schema.sql` / migrations).
- Trace environment variable references (`process.env.*`) to see where secrets and endpoints enter the application.

---

## 3. Architecture & Domain Analysis Guide

When reverse-engineering Bhojpatra, systematically analyze each of the following domains:

### 3.1 System Architecture
Map the structural relationships between:
- **Customer Frontend**: Public catalog, occasion browsing, menu customization, checkout/booking forms.
- **Vendor Portal / Interface**: Vendor onboarding, menu/pricing management, order visibility, status updates.
- **Admin Dashboard**: Booking oversight, vendor verification, platform settings, transaction monitoring.
- **Backend / Server Logic**: Server components, API routes, Server Actions, middleware.
- **Data Persistence**: Database engine, connection pooling, client wrapper.
- **External Services**: Razorpay, WhatsApp, document/image storage, third-party messaging.
- **Configuration & Environment**: Required runtime secrets, base URLs, webhook secrets.

### 3.2 End-to-End Data Flows
Trace data from origin to destination across user journeys:
1. **Catalog & Discovery**: Occasion selection → Vendor selection → Brand/tier selection → Menu/item selection (Veg vs. Non-Veg distribution).
2. **Booking Submission**: Form inputs → Client validation → State aggregation → Server-side submission.
3. **Payment Processing**: Order generation → Client payment checkout (Razorpay) → Payment verification / Webhook capture → Status update.
4. **Enquiry & Messaging**: WhatsApp click-to-chat generation vs. WhatsApp Cloud API automated dispatch.
5. **Media & File Handling**: Upload origins (vendor KYC, booking receipts, menu photos) → Temporary handling → Long-term persistence.
6. **State Synchronization**: Database updates → Vendor notifications → Admin notifications → Customer confirmations.

### 3.3 Booking Architecture Deep-Dive
Bhojpatra features distinct catering service models. Analyze and contrast how the codebase implements each of them:
- **Feast**: Full-service event catering, multi-course menus, guest count thresholds, tier selections, service staff requirements.
- **Baina**: Traditional ceremonial/meal delivery batches, fixed packages, distribution-oriented bookings.
- **Single Stall**: Single live station or specific food cart setup, limited menu footprint, hourly or item-based pricing.
- **Live Stall**: On-site interactive cooking stall(s), specialized equipment/staff requirements, add-on to larger bookings or standalone.

For **each** flow, document:
- **Entry Point**: Page URL, triggering component, navigation route.
- **Required Inputs**: Mandatory fields (date, location, guest count, slot, contact info).
- **Optional Inputs / Add-ons**: Special instructions, custom items, additional staff.
- **State Management**: Form state (React hook form, local state, context, URL query params, localStorage).
- **Processing Components**: Client pages, intermediate modals, review screens.
- **Backend Handlers**: Specific API route (`/api/...`) or Server Action name and path.
- **Database Operations**: Inserted tables, foreign key linkage, transaction boundaries.
- **Validation**: Client-side validation schemas (e.g. Zod, Yup) vs. server-side checks.
- **Booking State Lifecycle**: Initial status (e.g., `PENDING`), payment transition (`CONFIRMED` / `PAID`), vendor assignment, cancellation/failure paths.
- **Status Classification**: Tag as `[IMPLEMENTED]`, `[PARTIALLY IMPLEMENTED]`, `[MOCK DATA]`, or `[NOT IMPLEMENTED]`.

### 3.4 Database & Schema Mapping
Inspect `schema.sql`, migration files, and database utility code:
- **Entities & Tables**: List all physical tables and views.
- **Primary & Foreign Keys**: Map relationships (1:1, 1:N, N:M junction tables).
- **Constraints & Indexes**: Nullability, unique constraints, check constraints, indexes.
- **Module Ownership**: Identify which backend modules/routes read from and write to each table.
- **Sensitive Data Audit**: Flag tables holding credentials, password hashes, payment identifiers, customer PII, phone numbers, and addresses.
- **Relationship Matrix**: Explicitly verify how Users, Vendors, Menus, Bookings, Payments, and Reviews relate.

### 3.5 Authentication & Authorization Architecture
Inspect authentication and access control mechanisms:
- **Mechanism**: Session cookies, JWT tokens, header-based bearer tokens, Supabase session, or local mock auth.
- **Token / Session Handling**: Issuance, validation, storage (HTTP-only cookies vs. localStorage), revocation/expiry.
- **Roles & Permissions**: Definitions of `Customer`, `Vendor`, `Admin`, `Superadmin`, `Guest`.
- **Enforcement Layers**:
  - Edge / Middleware (`middleware.ts`)
  - Server Component / Page-level redirects
  - API Route authorization guards (`req` inspection)
  - Server Action session verifications
  - Database-level policies (Postgres RLS if enabled)
- **Trust Boundaries**: Identify where the server blindly trusts client-provided identity (`userId` from body vs. verified session).

### 3.6 External Integrations Architecture
Inspect integration touchpoints:
- **Razorpay**:
  - Client checkout trigger vs. server order creation (`orders.create`).
  - Signature verification (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` validation using crypto HMAC SHA256).
  - Webhook endpoints, signature header verification, idempotency.
  - Test mode vs. production keys in environment configuration.
- **WhatsApp**:
  - Direct deep link (`https://wa.me/...`) with pre-filled text vs. WhatsApp Cloud/Business API webhooks.
  - Automated transactional messaging vs. manual customer outreach.
- **File / Media Storage**:
  - Local disk storage (`public/uploads`) vs. Cloud Object Storage (S3, Cloudinary, Supabase Storage).
  - Upload route handling, MIME-type validation, size limits, file renaming strategies.
- **Other Services**:
  - SMS gateways, Email services (Nodemailer, Resend, SendGrid), Map/Location APIs.

### 3.7 Security Architecture Observations (NON-MODIFYING)
Inspect the codebase for architectural security boundaries and document observations for future remediation passes. **Do not modify application code.**
- Client-to-server trust boundaries (e.g., pricing calculated client-side vs. server-side).
- Missing server-side authorization checks on admin/vendor routes.
- Insecure Direct Object References (IDOR) in booking queries or vendor profile edits.
- Sensitive credentials or secrets exposed in client bundles or public repositories.
- Unvalidated file uploads (executable file upload risks, lack of path sanitization).
- Webhook signature bypass risks or missing idempotency.
- Database access safety (parameterized queries vs. raw SQL concatenation).

---

## 4. Documentation Output Specifications

The agent executing this skill must produce or update exactly **five markdown files in the project root**:

```
Bhojpatra/
├── ARCHITECTURE.md
├── DATA-FLOW.md
├── BOOKING-FLOWS.md
├── DATABASE-ERD.md
└── SECURITY-ARCHITECTURE.md
```

### 4.1 Diagram Standards
- **Format**: All diagrams must be written in **valid, editable Mermaid code blocks** (` ```mermaid `).
- **No Binaries**: Never output images, screenshots, or SVGs. Diagrams must remain textually editable.
- **Modularity**: Avoid single mega-diagrams that become unreadable. Break complex systems into focused, sub-system diagrams (e.g., separate Sequence diagrams for Order Placement vs. Payment Webhook).
- **Syntax Validation**: Ensure all Mermaid node labels with special characters (parentheses, slashes, brackets) are safely quoted (e.g., `A["Client (Browser)"] --> B["API Route (/api/booking)"]`).

---

## 5. Detailed Template & Requirements for Each Output File

### File 1: `ARCHITECTURE.md`
Must contain:
1. **Executive Overview**: High-level purpose of Bhojpatra and current state of the implementation.
2. **Technology Stack & Runtime Matrix**:
   - Runtime, framework, and package manager.
   - Core production dependencies and their roles.
   - Development dependencies.
3. **Application Layers & Directory Structure**:
   - Visual directory tree annotated with the role of each directory.
   - Separation of client components vs. server components/actions.
4. **System Architecture Diagram (Mermaid `flowchart TD` or `flowchart LR`)**:
   - Customer UI, Vendor UI, Admin UI.
   - Next.js Server / API Routes / Server Actions.
   - Database engine.
   - External services (Razorpay, WhatsApp, Storage).
5. **Component Interaction & Routing Architecture**:
   - Route hierarchy (App router groups, dynamic routes `[id]`, protected routes).
6. **Environment & Runtime Dependencies**:
   - Inventory of required environment variables, their usage, and whether they are public (`NEXT_PUBLIC_`) or private.
7. **Discrepancies & Current State Notes**:
   - Differences between legacy docs/notes and active code.
   - Unverified or stubbed architectural elements.

### File 2: `DATA-FLOW.md`
Must contain:
1. **End-to-End Data Flow Overview**: Narrative describing how data travels through the system.
2. **High-Level Data Flow Diagram (Mermaid `flowchart TD`)**:
   - Customer input → Client state → Server boundary → Business logic → Database → Outbound integrations.
3. **Customer Journey Data Flow**:
   - Onboarding/browsing data flow.
   - Occasion & caterer discovery data flow.
4. **Booking & Checkout Data Flow (Mermaid `sequenceDiagram`)**:
   - Step-by-step sequence diagram from menu selection to booking confirmation.
5. **Payment Processing Data Flow (Mermaid `sequenceDiagram`)**:
   - Detailed sequence showing Browser, Next.js Server, Razorpay API, and Database interaction during order creation, payment capture, and callback/webhook verification.
6. **Vendor & Admin Data Flow**:
   - How vendor profile/menu changes flow into the database.
   - How admin status updates and approvals are processed.
7. **External Communication Data Flow**:
   - WhatsApp message trigger and delivery paths.
   - File/document upload data flow (Client → Server → Storage).
8. **Trust Boundaries & Data Validation Gates**:
   - Identification of points where untrusted user input enters the system and where validation occurs.

### File 3: `BOOKING-FLOWS.md`
Must contain:
1. **Overview of Bhojpatra Booking Concepts**:
   - Comparison matrix contrasting **Feast**, **Baina**, **Single Stall**, and **Live Stall**.
2. **Service Flow Analysis (Four Distinct Sections)**:
   For each of the four booking types:
   - **Service Definition**: Conceptual purpose and target use case.
   - **Current Implementation Status**: `[IMPLEMENTED]`, `[PARTIALLY IMPLEMENTED]`, `[MOCK ONLY]`, or `[NOT IMPLEMENTED]`.
   - **Entry Point & User Interface**: File path of pages and components.
   - **Input Parameters (Required vs. Optional)**: Form fields, catering choices, guest counts.
   - **Client State Handling**: How selections are stored across wizard steps.
   - **Backend Handlers**: Specific API endpoints or Server Actions invoked.
   - **Database Persistence**: Tables, columns, and records created.
   - **Pricing & Tier Calculation**: Where and how calculations occur.
   - **Error Handling & Edge Cases**: What happens on validation failure or network failure.
   - **Mermaid Flowchart or State Diagram**: Visualizing the flow lifecycle.
3. **Booking State Lifecycle Diagram (Mermaid `stateDiagram-v2`)**:
   - States: `DRAFT`, `PENDING_PAYMENT`, `CONFIRMED`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
   - Transitions, triggers, and rollback rules.
4. **Code References & Discrepancies**:
   - Explicit file links (`file:///...`) pointing to booking handlers and components.
   - List of planned booking features not yet implemented in code.

### File 4: `DATABASE-ERD.md`
Must contain:
1. **Database Overview**: Engine, schema name, ORM/query layer used.
2. **Entity-Relationship Diagram (Mermaid `erDiagram`)**:
   - Complete ER diagram showing all tables, primary keys, foreign keys, and cardinalities (`||--o{`, `||--||`, etc.).
3. **Entity Catalog & Dictionary**:
   - Table-by-table breakdown.
   - Columns, data types, constraints (`NOT NULL`, `DEFAULT`, `CHECK`, `UNIQUE`).
   - Description of table purpose.
4. **Application Module Mapping**:
   - Table listing which source files read from each table.
   - Table listing which source files write/update each table.
5. **Sensitive Data Classification**:
   - Matrix highlighting tables and fields storing passwords, payment IDs, PII, and financial records.
6. **Integrity & Constraint Notes**:
   - Missing foreign key constraints, missing indexes on frequent query paths, or unconstrained fields observed in code.

### File 5: `SECURITY-ARCHITECTURE.md`
Must contain:
1. **Security Architecture Overview**: Core security model of the current codebase.
2. **Authentication Architecture**:
   - Session/token lifecycle.
   - Where credentials and sessions are validated.
3. **Authorization & Role Matrix**:
   - Table mapping Roles (`Guest`, `Customer`, `Vendor`, `Admin`) against Platform Capabilities (Browse, Book, View Orders, Edit Menus, Manage Platform).
   - Detailed review of where authorization is enforced (Client route vs. Server handler vs. Database level).
4. **Trust Boundaries & Attack Surface Diagram (Mermaid `flowchart TD`)**:
   - Highlighting untrusted zones (browser/client), semi-trusted zones (webhooks), trusted zones (server runtime), and secure data zones (database).
5. **Security-Relevant Architecture Observations (AUDIT LOG ONLY - NO FIXES)**:
   - Specific, code-referenced observations categorized by vulnerability family:
     - Broken Object-Level Authorization (BOLA / IDOR)
     - Authentication & Session Flaws
     - Broken Function-Level Authorization (Admin/Vendor privilege bypass)
     - Insecure Payment Flow (client-side price manipulation or unverified payment state)
     - File Upload & Storage Risks
     - Data Exposure & Secret Management
     - Injection & Parameterization status in database queries
   - Each observation must cite the exact file path and line numbers.
   - **Explicit disclaimer: No vulnerabilities were modified or fixed during this architecture mapping phase.**

---

## 6. Rigorous Citation & Evidence Standards

Every document generated must adhere to strict evidence standards:

1. **File References**: Use markdown links with absolute or relative repo paths and line number references wherever possible:
   - Example: `[Booking Route](file:///src/app/api/bookings/route.ts#L35-L62)` or `[`src/app/api/bookings/route.ts`](file:///src/app/api/bookings/route.ts)`.
2. **Quoted Signatures**: When documenting APIs, quote the actual TypeScript interface, Zod schema, or SQL table definition from the code.
3. **Document Discrepancies Explicitly**: If `SETUP-DATABASE.md` documents a column `guest_count INT` but `schema.sql` has `guests_num VARCHAR`, highlight this discrepancy explicitly in `DATABASE-ERD.md`.
4. **Status Badges**: Use clear tags when documenting features:
   - `[IMPLEMENTED]` - Confirmed working code path exists from UI to database.
   - `[PARTIALLY IMPLEMENTED]` - Endpoint or UI exists, but persistence or integration is missing.
   - `[STUB / MOCK]` - Returns hardcoded data or mock UI with no backend connection.
   - `[UNVERIFIED / UNKNOWN]` - Reference found in docs or comments, but no code found.

---

## 7. Execution Checklist (Final Verification)

Before completing the skill execution and reporting back, verify the following checklist:

- [ ] **Zero Code Modifications**: Verify with `git status` or file diffs that no application code, schema, config, or test files were changed.
- [ ] **All 5 Root Documents Created**:
  - `ARCHITECTURE.md` exists in project root.
  - `DATA-FLOW.md` exists in project root.
  - `BOOKING-FLOWS.md` exists in project root.
  - `DATABASE-ERD.md` exists in project root.
  - `SECURITY-ARCHITECTURE.md` exists in project root.
- [ ] **Mermaid Syntax Verified**: Every Mermaid diagram has valid syntax, quoted special characters, and renders cleanly.
- [ ] **Code Citations Verified**: Every documented endpoint, table, component, and flow links to an actual file in the repository.
- [ ] **Booking Concepts Distinguished**: Clear distinction documented between Feast, Baina, Single Stall, and Live Stall based on real code evidence.
- [ ] **No Hallucinated Infrastructure**: Only services, databases, and dependencies actually found in the code or config are documented.
- [ ] **Security Observations Documented Without Code Edits**: Security risks are recorded objectively as architecture findings without attempting code fixes.
