/**
 * Mock data for the Admin Panel.
 *
 * Phase 1A only needs the admin profile (topbar). Dashboard mock data
 * (KPIs, bookings, approvals, etc.) is added in Phase 1B. Every export is
 * shaped to mirror an eventual API response so swapping to a real fetch is a
 * one-line change with no component edits.
 */
import type { AdminProfile } from "./types";

export const adminProfile: AdminProfile = {
  name: "Ankit Srivastva",
  role: "Super Admin",
  initials: "AS",
};
