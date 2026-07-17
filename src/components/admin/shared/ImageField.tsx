"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { isUnoptimized } from "@/lib/homeContent";
import { inputClass } from "./FormControls";

/**
 * Admin image picker. Shows a live thumbnail of the current image and lets the
 * editor either paste a URL or upload a file. Uploads are downscaled and
 * re-encoded to a compact data URL on the client so they stay small when saved
 * with the rest of the content (persisted to the database) and render via
 * next/image.
 *
 * The default profile (1280px JPEG) suits thumbnails and logos. Pass
 * `highQuality` for images shown large — e.g. the full-width promotional banner
 * — to keep more resolution (2000px), skip the lossy JPEG re-encode for PNG
 * artwork (crisp text / flat colour, no ringing), and only fall back to a
 * high-quality JPEG when a PNG would be too heavy to store inline.
 */

const MAX_DIM = 1280; // longest edge, px (default profile)
const QUALITY = 0.82;

const HQ_MAX_DIM = 2000; // longest edge for the high-quality profile
const HQ_QUALITY = 0.92;
// Cap for a high-quality PNG data URL (~1.35 MB of bytes once base64-decoded).
// Beyond this a lossless PNG is too heavy to inline in the content singleton,
// so we fall back to a high-quality JPEG instead.
const HQ_PNG_MAX_CHARS = 1_800_000;

/** Read a File, downscale to fit `maxDim` and return a compact data URL. In
 *  high-quality mode a PNG source stays PNG (lossless) unless that would be too
 *  large to inline, in which case it re-encodes to a high-quality JPEG. */
function fileToDataUrl(
  file: File,
  { maxDim, highQuality }: { maxDim: number; highQuality: boolean },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read-failed"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode-failed"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no-context"));
        ctx.drawImage(img, 0, 0, w, h);

        if (highQuality && file.type === "image/png") {
          const png = canvas.toDataURL("image/png");
          resolve(
            png.length <= HQ_PNG_MAX_CHARS
              ? png
              : canvas.toDataURL("image/jpeg", HQ_QUALITY),
          );
          return;
        }
        resolve(
          canvas.toDataURL("image/jpeg", highQuality ? HQ_QUALITY : QUALITY),
        );
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
  highQuality = false,
}: {
  label?: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
  /** Keep more resolution and skip the lossy JPEG re-encode for PNG artwork.
   *  Use for images displayed large (e.g. the full-width promotional banner). */
  highQuality?: boolean;
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
      onChange(
        await fileToDataUrl(file, {
          maxDim: highQuality ? HQ_MAX_DIM : MAX_DIM,
          highQuality,
        }),
      );
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
            value={value ?? ""}
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
