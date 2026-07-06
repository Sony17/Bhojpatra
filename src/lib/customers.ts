/**
 * Customer store.
 *
 * Backs the admin "Customer Management" console. Persisted to Postgres (Neon) or
 * a local JSON file via the shared `createStore` helper — the same idiom as
 * `vendorApplications.ts`. The list is seeded once from the former mock data
 * (`src/lib/admin/mockData.ts`) on the first empty read, so the console keeps
 * its content with no manual migration.
 */
import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";
import type {
  AdminCustomer,
  CustomerQuery,
  CustomerStatus,
  Paginated,
} from "@/lib/admin/types";
import { adminCustomers as SEED_CUSTOMERS } from "@/lib/admin/mockData";

/** The stored shape — the admin projection plus bookkeeping fields. A deleted
 *  customer keeps its row (audit) but is hidden from the console. */
export interface CustomerRecord extends AdminCustomer {
  createdAt: string;
  deleted?: boolean;
}
const store = createStore<CustomerRecord>({
  table: "customers",
  idField: "id",
});

export const CUSTOMER_STATUSES: CustomerStatus[] = ["Active", "Inactive"];

export function readCustomers(): Promise<CustomerRecord[]> {
  return store.list();
}

export function writeCustomers(rows: CustomerRecord[]): Promise<void> {
  return store.upsertMany(rows);
}

export function getCustomer(id: string): Promise<CustomerRecord | null> {
  return store.get(id);
}

export function upsertCustomer(rec: CustomerRecord): Promise<void> {
  return store.upsert(rec);
}

/** New human-facing id, matching the seed convention (`CU-xxxxxx`). */
export function newCustomerId(): string {
  return `CU-${randomUUID().slice(0, 6).toUpperCase()}`;
}

/** Read every customer, seeding the store from the mock list the first time it
 *  is empty. Returns live (non-deleted filtering is left to `queryCustomers`). */
export async function ensureSeededCustomers(): Promise<CustomerRecord[]> {
  const rows = await store.list();
  if (rows.length) return rows;
  const seeded: CustomerRecord[] = SEED_CUSTOMERS.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
  }));
  await store.upsertMany(seeded);
  return seeded;
}

/** Filtered, paginated projection for the admin console. Ported verbatim from
 *  the former `queryCustomers` in `mockData.ts` (hides soft-deleted rows). */
export function queryCustomers(
  params: CustomerQuery,
  source: CustomerRecord[],
): Paginated<AdminCustomer> {
  const { q = "", city = "All", status = "All", page = 1, pageSize = 8 } =
    params;
  const needle = q.trim().toLowerCase();
  const filtered = source
    .filter((c) => !c.deleted)
    .filter((c) => {
      const matchesQ =
        !needle ||
        c.name.toLowerCase().includes(needle) ||
        c.email.toLowerCase().includes(needle) ||
        c.phone.toLowerCase().includes(needle);
      const matchesCity = city === "All" || c.city === city;
      const matchesStatus = status === "All" || c.status === status;
      return matchesQ && matchesCity && matchesStatus;
    });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return {
    data: filtered.slice(start, start + pageSize).map(toAdminCustomer),
    page,
    pageSize,
    total,
  };
}

/** Client-safe projection (drops internal bookkeeping). */
export function toAdminCustomer(r: CustomerRecord): AdminCustomer {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    city: r.city,
    joined: r.joined,
    totalBookings: r.totalBookings,
    activeBookings: r.activeBookings,
    lifetimeSpend: r.lifetimeSpend,
    status: r.status,
  };
}

export function isCustomerStatus(v: unknown): v is CustomerStatus {
  return v === "Active" || v === "Inactive";
}
