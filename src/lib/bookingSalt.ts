// Browser-side salt for booking references (see `bookingRef` in bookingPricing).
//
// It lives in localStorage — not per-render, not per-tab — on purpose: if a
// customer pays and the tab dies before the booking is saved, rebuilding the
// same order must land on the SAME booking id, so the payments ledger (and the
// order route's double-pay guard) still recognises the money already taken.
// It's rotated only once a booking is safely saved, so the next booking from
// this browser gets a fresh id. Storage failures (private mode, blocked site
// data) fall back to an in-memory salt for the page's lifetime.
//
// The salt is also tied to the signed-in account: a shared browser (a family
// laptop, a cyber café) must never let account B's order land on an id that
// account A already paid against — the server would see "already paid" and
// confirm B's booking on A's money. So the salt rotates whenever a different
// account signs in than the one it was minted for.

import { newBookingSalt } from "@/lib/bookingPricing";

const SALT_KEY = "bhojpatra:booking:salt:v1";
const OWNER_KEY = "bhojpatra:booking:salt:owner";
let memorySalt = "";
let memoryOwner = "";

export function getBookingSalt(): string {
  if (typeof window === "undefined") return "";
  try {
    const saved = window.localStorage.getItem(SALT_KEY);
    if (saved) return saved;
    const fresh = newBookingSalt();
    window.localStorage.setItem(SALT_KEY, fresh);
    return fresh;
  } catch {
    if (!memorySalt) memorySalt = newBookingSalt();
    return memorySalt;
  }
}

/** The salt for the signed-in account: the current one when it was minted
 *  for this account (or for nobody yet), a fresh one when another account
 *  used this browser last. Call once the session is known, before any money
 *  is taken. */
export function bookingSaltFor(owner: string): string {
  if (typeof window === "undefined" || !owner) return getBookingSalt();
  const key = owner.trim().toLowerCase();
  try {
    const prevOwner = window.localStorage.getItem(OWNER_KEY) ?? "";
    if (prevOwner && prevOwner !== key) {
      window.localStorage.setItem(SALT_KEY, newBookingSalt());
    }
    window.localStorage.setItem(OWNER_KEY, key);
    return getBookingSalt();
  } catch {
    if (memoryOwner && memoryOwner !== key) memorySalt = newBookingSalt();
    memoryOwner = key;
    return getBookingSalt();
  }
}

/** Call after a booking is saved, so the next one from this browser gets a new
 *  id. The current screen keeps its id (it holds the salt in state). */
export function rotateBookingSalt(): void {
  memorySalt = "";
  try {
    window.localStorage.setItem(SALT_KEY, newBookingSalt());
  } catch {
    // Storage blocked — the in-memory salt above already resets on reload.
  }
}
