"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { isUnoptimized } from "@/lib/homeContent";
import { inputClass } from "./FormControls";

/**
 * Admin image picker. Shows a live thumbnail of the current image and lets the
 * editor either paste a URL or upload a file. Uploads are downscaled and
 * re-encoded to a compact data URL on the client (there is no backend in this
 * prototype) so they fit comfortably in localStorage and render via next/image.
 */

const MAX_DIM = 1280; // longest edge, px
const QUALITY = 0.82;

/** Read a File, downscale to MAX_DIM and return a JPEG data URL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no-context"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageField({
  label = "Image",
  value,
  onChange,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      setError("Couldn't process that image. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <div className="flex items-start gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-cream-3 bg-cream/40">
          {value ? (
            <Image
              src={value}
              alt=""
              fill
              sizes="80px"
              className="object-cover"
              unoptimized={isUnoptimized(value)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] text-ink-soft">
              No image
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            id={fieldId}
            className={inputClass}
            value={value}
            placeholder="Paste an image URL or upload"
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-full border border-cream-3 px-4 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-cream-2 disabled:opacity-60"
            >
              {busy ? "Processing…" : "Upload"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {hint && <span className="text-xs text-ink-soft">{hint}</span>}
          </div>
          {error && <p className="text-xs font-medium text-maroon">{error}</p>}
        </div>
      </div>
    </div>
  );
}
