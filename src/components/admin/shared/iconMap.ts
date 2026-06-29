import type { ComponentType, SVGProps } from "react";
import {
  Store,
  ShieldCheck,
  Calendar,
  Wallet,
  Users,
  Ticket,
  PlusCircle,
  BarChart,
  Layout,
  Gear,
} from "./icons";
import type { AdminIconKey } from "@/lib/admin/types";

/**
 * Resolves a data-driven `AdminIconKey` (from mockData) to its icon component.
 * Keeping this here lets KPI cards and quick actions stay fully data-driven —
 * the mock data (and later the API) only carries a string key, never JSX.
 */
export const adminIcon: Record<
  AdminIconKey,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  vendors: Store,
  approvals: ShieldCheck,
  bookings: Calendar,
  revenue: Wallet,
  customers: Users,
  coupons: Ticket,
  addons: PlusCircle,
  payments: Wallet,
  content: Layout,
  reports: BarChart,
  settings: Gear,
};
