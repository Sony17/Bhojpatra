"use client";

import { useEffect, useState } from "react";
import { packages as seedPackages } from "@/lib/data";

export type PackageNameConfig = {
  id: string;
  name: string;
  nameHi: string;
  tagline?: string;
  taglineHi?: string;
};

export const DEFAULT_PACKAGE_NAMES: PackageNameConfig[] = seedPackages
  .filter((p) => p.id !== "custom")
  .map((p) => ({
    id: p.id,
    name: p.name,
    nameHi: p.nameHi,
    tagline: p.tagline,
    taglineHi: p.taglineHi,
  }));

let cache: PackageNameConfig[] | null = null;

/**
 * Client hook returning the live package/tier naming configuration.
 * Starts from the seed definitions in `@/lib/data`, then swaps in the
 * admin-managed names from `/api/admin/packages`.
 */
export function usePackagesConfig(): PackageNameConfig[] {
  const [list, setList] = useState<PackageNameConfig[]>(
    cache ?? DEFAULT_PACKAGE_NAMES,
  );

  useEffect(() => {
    let active = true;
    fetch("/api/admin/packages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { packages?: PackageNameConfig[] } | null) => {
        const next = d?.packages;
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

/**
 * Resolve the localized package/tier name from configured names.
 */
export function resolvePackageName(
  packageId: string,
  configs: PackageNameConfig[],
  lang: string = "en",
  fallback?: string,
): string {
  const found = configs.find(
    (p) => p.id.toLowerCase() === packageId.toLowerCase(),
  );
  if (!found) return fallback ?? packageId;
  return lang === "hi" ? found.nameHi || found.name : found.name;
}

/**
 * Resolve the localized package/tier tagline from configured names.
 */
export function resolvePackageTagline(
  packageId: string,
  configs: PackageNameConfig[],
  lang: string = "en",
  fallback?: string,
): string | undefined {
  const found = configs.find(
    (p) => p.id.toLowerCase() === packageId.toLowerCase(),
  );
  if (!found) return fallback;
  return lang === "hi"
    ? found.taglineHi || found.tagline || fallback
    : found.tagline || fallback;
}
