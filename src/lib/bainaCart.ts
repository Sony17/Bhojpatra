"use client";

import { useCallback, useSyncExternalStore } from "react";
import { BAINA_BOX_VENDOR_DATA, type BainaBoxProduct, type BainaBoxVendorData } from "./bainaBoxData";

export interface BainaCartLine {
  id: string; // product id e.g. "ram-4"
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  name: string;
  price: number;
  unit: string;
  qty: number;
  image: string;
}

const KEY = "bhojpatra:baina_cart";
const EVENT = "bhojpatra:baina_cart_change";

const EMPTY_MAP: Record<string, number> = {};
let cacheMap: Record<string, number> = EMPTY_MAP;
let cacheRaw = " ";

/** Find product & vendor metadata by product ID across all Baina Box vendors */
export function findBainaProduct(productId: string): { product: BainaBoxProduct; vendor: BainaBoxVendorData } | null {
  for (const vendor of Object.values(BAINA_BOX_VENDOR_DATA)) {
    const p = vendor.products.find((prod) => prod.id === productId);
    if (p) return { product: p, vendor };
  }
  return null;
}

function getSnapshot(): Record<string, number> {
  if (typeof window === "undefined") return EMPTY_MAP;
  const raw = window.localStorage.getItem(KEY) ?? "{}";
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      const obj = JSON.parse(raw);
      cacheMap = typeof obj === "object" && obj !== null ? obj : EMPTY_MAP;
    } catch {
      cacheMap = EMPTY_MAP;
    }
  }
  return cacheMap;
}

function getServerSnapshot(): Record<string, number> {
  return EMPTY_MAP;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function write(map: Record<string, number>) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Reactive access to persistent Baina Box cart, synced across every page/component. */
export function useBainaCart() {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setQty = useCallback((productId: string, qty: number) => {
    const cur = { ...getSnapshot() };
    if (qty <= 0) {
      delete cur[productId];
    } else {
      cur[productId] = qty;
    }
    write(cur);
  }, []);

  const clear = useCallback(() => {
    write({});
  }, []);

  // Compute active cart lines with full details
  const lines: BainaCartLine[] = [];
  let totalBoxes = 0;
  let totalAmount = 0;

  for (const [prodId, qty] of Object.entries(map)) {
    if (qty > 0) {
      const info = findBainaProduct(prodId);
      if (info) {
        lines.push({
          id: prodId,
          vendorId: info.vendor.vendorId,
          vendorSlug: info.vendor.slug,
          vendorName: info.vendor.name,
          name: info.product.name,
          price: info.product.price,
          unit: info.product.unit,
          qty,
          image: info.product.image,
        });
        totalBoxes += qty;
        totalAmount += qty * info.product.price;
      }
    }
  }

  // Derive primary vendor if all items are from one vendor or primary item
  const primaryVendorSlug = lines[0]?.vendorSlug ?? "ram-asrey";

  return {
    map,
    lines,
    totalBoxes,
    totalAmount,
    primaryVendorSlug,
    setQty,
    clear,
  };
}
