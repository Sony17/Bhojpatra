"use client";

import { useSyncExternalStore } from "react";
import { BAINA_BOX_VENDOR_DATA, type BainaBoxVendorData } from "@/lib/bainaBoxData";

export interface BainaCartState {
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  qty: Record<string, number>;
}

const STORAGE_KEY = "bhojpatra:baina-cart";
const CHANGE_EVENT = "bhojpatra:baina-cart-change";

let memoryState: BainaCartState | null = null;
let memoryRaw = "";

function getSnapshot(): BainaCartState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw !== memoryRaw) {
    memoryRaw = raw;
    if (!raw) {
      memoryState = null;
    } else {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.vendorId === "string" && parsed.qty) {
          memoryState = parsed;
        } else {
          memoryState = null;
        }
      } catch {
        memoryState = null;
      }
    }
  }
  return memoryState;
}

function getServerSnapshot(): BainaCartState | null {
  return null;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveBainaCart(state: BainaCartState | null): void {
  if (typeof window === "undefined") return;
  try {
    const hasItems = state && Object.values(state.qty).some((n) => n > 0);
    if (!state || !hasItems) {
      window.localStorage.removeItem(STORAGE_KEY);
      memoryState = null;
      memoryRaw = "";
    } else {
      const raw = JSON.stringify(state);
      window.localStorage.setItem(STORAGE_KEY, raw);
      memoryState = state;
      memoryRaw = raw;
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {}
}

export function clearBainaCart(): void {
  saveBainaCart(null);
}

export function useBainaCart(): BainaCartState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Get the resolved active cart vendor data and line calculations. */
export function resolveBainaCartSummary(cart: BainaCartState | null): {
  vendor: BainaBoxVendorData | null;
  itemCount: number;
  totalBoxes: number;
  totalAmount: number;
  lines: Array<{ id: string; name: string; price: number; unit: string; qty: number }>;
} {
  if (!cart) {
    return { vendor: null, itemCount: 0, totalBoxes: 0, totalAmount: 0, lines: [] };
  }

  const vendor =
    BAINA_BOX_VENDOR_DATA[cart.vendorSlug] ||
    Object.values(BAINA_BOX_VENDOR_DATA).find((v) => v.vendorId === cart.vendorId) ||
    null;

  if (!vendor) {
    return { vendor: null, itemCount: 0, totalBoxes: 0, totalAmount: 0, lines: [] };
  }

  const lines = vendor.products
    .map((p) => ({ ...p, qty: cart.qty[p.id] ?? 0 }))
    .filter((p) => p.qty > 0);

  const itemCount = lines.length;
  const totalBoxes = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalAmount = lines.reduce((sum, l) => sum + l.qty * l.price, 0);

  return { vendor, itemCount, totalBoxes, totalAmount, lines };
}
