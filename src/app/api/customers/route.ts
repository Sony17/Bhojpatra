import {
  ensureSeededCustomers,
  newCustomerId,
  queryCustomers,
  toAdminCustomer,
  upsertCustomer,
  type CustomerRecord,
} from "@/lib/customers";
import { isValidEmail, isValidPhone, normalizePhone, parseListQuery } from "@/lib/validate";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/customers?q&city&status&page&pageSize → Paginated<AdminCustomer>
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const { q, city, status, page, pageSize } = parseListQuery(request.url);
  const rows = await ensureSeededCustomers();
  const result = queryCustomers(
    { q, city, status: status as never, page, pageSize },
    rows,
  );
  return Response.json(result);
}

// POST /api/customers → create a customer
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "Customer name is required." }, { status: 400 });
  }
  if (!isValidEmail(body.email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!isValidPhone(body.phone)) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }

  const now = new Date();
  const record: CustomerRecord = {
    id: newCustomerId(),
    name,
    email: (body.email as string).trim().toLowerCase(),
    phone: normalizePhone((body.phone as string).trim()),
    city: typeof body.city === "string" && body.city.trim() ? body.city.trim() : "—",
    joined: now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    totalBookings: 0,
    activeBookings: 0,
    lifetimeSpend: 0,
    status: "Active",
    createdAt: now.toISOString(),
  };

  try {
    await upsertCustomer(record);
  } catch (err) {
    console.error("Failed to create customer", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, customer: toAdminCustomer(record) }, { status: 201 });
}
