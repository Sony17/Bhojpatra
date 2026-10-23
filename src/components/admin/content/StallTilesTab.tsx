"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import WidgetCard from "@/components/admin/shared/WidgetCard";
import ImageField from "@/components/admin/shared/ImageField";
import { stallTypes } from "@/lib/stallTypes";
import type { StallTileImages } from "@/lib/stallTileImages";

const ENDPOINT = "/api/admin/stall-tile-images";

/**
 * Admin editor for the /book/stall "What stall do you want?" tile photos — one
 * per stall type. Saving rewrites the whole set: a tile left empty shows its
 * icon on the live page, never a stock photo.
 */
export default function StallTilesTab() {
  const [draft, setDraft] = useState<StallTileImages | null>(null);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const apply = (json: { images?: StallTileImages; custom?: boolean }) => {
    setDraft(json.images ?? {});
    setCustom(!!json.custom);
  };

  useEffect(() => {
    let active = true;
    fetch(ENDPOINT, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => active && apply(json))
      .catch(() => active && setStatus({ ok: false, text: "Couldn't load the tile photos." }));
    return () => {
      active = false;
    };
  }, []);

  const send = async (method: "PUT" | "DELETE") => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(ENDPOINT, {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "PUT" ? JSON.stringify({ images: draft }) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't save. Please try again.");
      apply(json);
      setStatus({ ok: true, text: method === "PUT" ? "Saved ✓" : "Reset to the starting photos ✓" });
    } catch (err) {
      setStatus({ ok: false, text: err instanceof Error ? err.message : "Couldn't save." });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (window.confirm("Replace every tile photo with the starting photos? This can't be undone.")) {
      void send("DELETE");
    }
  };

  return (
    <WidgetCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <a
            href="/book/stall"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-ink-soft hover:underline"
          >
            View Single Stall tiles
          </a>
          <p className="mt-0.5 text-xs text-ink-soft">
            {custom
              ? "Showing your saved photos. A tile left empty shows its icon."
              : "Showing the starting photos — save to make this set yours."}
          </p>
        </div>
        {status && (
          <span className="text-xs font-medium text-maroon" role={status.ok ? undefined : "alert"}>
            {status.text}
          </span>
        )}
      </div>

      {draft ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {stallTypes.map((s) => (
            <ImageField
              key={s.id}
              label={`${s.icon} ${s.name}`}
              value={draft[s.id] ?? ""}
              onChange={(v) => {
                setDraft((d) => ({ ...d, [s.id]: v }));
                setStatus(null);
              }}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-soft">Loading…</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <Button variant="ghost" size="sm" onClick={reset} disabled={busy || !custom}>
          Reset to starting photos
        </Button>
        <Button size="sm" onClick={() => void send("PUT")} disabled={busy || !draft}>
          {busy ? "Saving…" : "Save tile photos"}
        </Button>
      </div>
    </WidgetCard>
  );
}
