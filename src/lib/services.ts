"use client";

import { useEffect, useState } from "react";
import { servicePackages, type ServicePackage } from "@/lib/data";

/**
 * Service packages shown in the booking wizard's mandatory "Choose Your Service
 * Package" step (and the marketing `/service-packages` page).
 *
 * The canonical list lives in the admin-managed `services` settings singleton
 * (`/api/admin/services`). The seed `servicePackages` from `@/lib/data` is the
 * fallback so the step keeps working before the admin customises anything, or
 * offline.
 */
export type { ServicePackage } from "@/lib/data";

/** Seed list used until the admin-configured list loads. */
export const DEFAULT_SERVICES: ServicePackage[] = servicePackages;

/** Slug an admin-entered package name into a stable, url-safe id. */
export function slugifyService(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let cache: ServicePackage[] | null = null;

/**
 * Client hook returning the live service-package list. Starts from the seed,
 * then swaps in the admin-configured list once fetched (cached across mounts so
 * the wizard step doesn't flash on navigation).
 */
export function useServices(): ServicePackage[] {
  const [list, setList] = useState<ServicePackage[]>(cache ?? DEFAULT_SERVICES);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/services")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { services?: ServicePackage[] } | null) => {
        const next = d?.services;
        if (active && Array.isArray(next) && next.length) {
          cache = next;
          setList(next);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return list;
}
