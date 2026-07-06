-- Bhojpatra database schema (Neon Postgres).
--
-- Run this ONCE against the Neon database after provisioning it in the Vercel
-- dashboard (Storage → Neon → open the SQL Editor, paste, run). Every record
-- store keeps the full record in a `data` jsonb column so the API responses are
-- identical to the previous on-disk JSON stores; `seq` preserves insertion
-- order. Re-running is safe — every statement is `if not exists`.

create table if not exists bookings (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Leads are de-duplicated by email (the id-field for this store).
create table if not exists leads (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Referral partners are keyed by their referral code.
create table if not exists partners (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists venues (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists vendor_applications (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Live vendor profiles + published menus (an account-owned caterer surfaced in
-- the catalogue, distinct from the one-off vendor_applications).
create table if not exists vendors (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Vendor photo metadata (card / dish / gallery). The bytes live in Vercel Blob
-- (the record carries the blob URL); only the metadata is stored here.
create table if not exists vendor_photos (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- KYC document metadata. The uploaded file bytes live in Vercel Blob (the
-- record carries the blob URL); only the metadata is stored here.
create table if not exists kyc_documents (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Single-row settings (merchant UPI identity, etc.), keyed by name.
create table if not exists settings (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Registered customers (admin Customer Management). Seeded from the former mock
-- list on first empty read so the console keeps its data.
create table if not exists customers (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Discount coupons (admin Coupon Manager).
create table if not exists coupons (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Homepage promotional campaigns (admin Campaigns). Each carries an image (an
-- uploaded data URL or a pasted URL) shown to visitors as a popup; the most
-- recent Active one wins.
create table if not exists campaigns (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- CMS content — banners, testimonials and FAQs in one table, discriminated by
-- `data->>'kind'` ('banner' | 'testimonial' | 'faq').
create table if not exists content_items (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Public contact-form enquiries (ContactPage).
create table if not exists enquiries (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Customer reviews left from My Bookings after a completed event. Keyed by the
-- booking id (one review per booking) and surfaced in the home testimonials.
create table if not exists reviews (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Auth users (customer / vendor / partner / admin). The scrypt password hash
-- lives inside `data` and is never returned by any API projection.
create table if not exists users (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Server-side sessions (opaque token -> user), validated against a signed cookie.
create table if not exists sessions (
  id         text primary key,
  seq        bigint generated always as identity,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
