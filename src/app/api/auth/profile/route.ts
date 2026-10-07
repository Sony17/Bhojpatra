/**
 * The signed-in user's profile: the display name (the email is the unique login
 * handle and stays immutable here), plus the one-way customer → vendor
 * conversion used by vendor registration. Persists to the user record
 * and returns the refreshed public projection so the client session can update
 * the header/menu immediately (mirrors `/api/auth/preferences`).
 */
import { getSessionUser } from "@/lib/auth";
import { createStore } from "@/lib/store";
import { getUserById, saveUser, toPublicUser } from "@/lib/users";
import type { StoredOrder } from "@/app/api/bookings/route";

export const dynamic = "force-dynamic";

/** Keep names within a sane, single-line length. */
const MAX_NAME_LEN = 80;

// Read-only here: used to check whether a customer has bookings before their
// account is converted to a vendor (one email = one role).
const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

/** Does this account own any booking (by session user id or contact email)? */
async function hasBookings(userId: string, email: string): Promise<boolean> {
  const key = email.trim().toLowerCase();
  const orders = await bookingStore.list();
  return orders.some(
    (o) => o.userId === userId || (!!key && o.email?.trim().toLowerCase() === key),
  );
}

// PATCH /api/auth/profile { name } → save the display name.
export async function PATCH(request: Request) {
  const publicUser = await getSessionUser();
  if (!publicUser) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const record = await getUserById(publicUser.id);
  if (!record) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  if (body.name !== undefined) {
    if (typeof body.name !== "string") {
      return Response.json({ error: "Invalid name." }, { status: 400 });
    }
    const name = body.name.trim().slice(0, MAX_NAME_LEN);
    record.name = name || undefined;
  }

  // Converting a customer account into a vendor account. One email holds one
  // role, so the customer dashboard (and their bookings) would disappear — it
  // needs an explicit confirmation, and is refused outright once they have any
  // booking (they should register the kitchen under a different email).
  if (body.role === "vendor" && record.role === "customer") {
    if (body.confirm !== true) {
      return Response.json(
        { error: "Please confirm converting this account to a vendor account." },
        { status: 400 },
      );
    }
    let booked: boolean;
    try {
      booked = await hasBookings(record.id, record.email);
    } catch (err) {
      console.error("Failed to check bookings before vendor conversion", err);
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }
    if (booked) {
      return Response.json(
        {
          error:
            "This account has bookings, so it can't become a vendor account. Please register your kitchen with a different email.",
        },
        { status: 409 },
      );
    }
    record.role = "vendor";
    record.accounts = ["vendor"];
  }

  try {
    await saveUser(record);
  } catch (err) {
    console.error("Failed to save profile", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ user: toPublicUser(record) });
}
