/**
 * Admin Panel domain types.
 *
 * Phase 1A only declares what the shell needs (the admin identity shown in the
 * topbar). Dashboard/module types are added in their own phases so each commit
 * stays logically scoped.
 */

/** Admin identity shown in the topbar avatar/welcome. */
export interface AdminProfile {
  name: string;
  role: string;
  initials: string;
}
