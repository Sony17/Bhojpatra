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
