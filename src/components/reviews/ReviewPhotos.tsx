"use client";

/**
 * Photo attachments for a customer review (Flipkart-style).
 *
 * `ReviewPhotoEditor` — pick JPG/PNG/WebP images; each uploads immediately to
 * `POST /api/reviews/photo` (public Vercel Blob) and its URL is added to the
 * review. Capped at `REVIEW_IMAGES_MAX`.
 *
 * `ReviewPhotoStrip` — read-only thumbnails on a submitted review; tapping one
 * opens the full-size photo in a new tab.
 */

import { useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/i18n";

/** Most photos a reviewer can attach to one rating (mirrors the API cap). */
export const REVIEW_IMAGES_MAX = 4;

/** Upload one file, returning its public URL (throws with a message on error). */
async function uploadReviewPhoto(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/reviews/photo", { method: "POST", body: fd });
  const data = (await res.json().catch(() => null)) as
    | { url?: string; error?: string }
    | null;
  if (!res.ok || !data?.url) {
    throw new Error(data?.error || "Upload failed. Please try again.");
  }
  return data.url;
}

const thumbBox =
  "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-cream-3 bg-cream-2";

export function ReviewPhotoEditor({
  images,
  onChange,
}: {
  images: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file after a remove
    if (!files.length) return;
    setError("");
    const room = REVIEW_IMAGES_MAX - images.length;
    if (room <= 0) {
      setError(
        t(
          `You can add up to ${REVIEW_IMAGES_MAX} photos.`,
          `आप ${REVIEW_IMAGES_MAX} फ़ोटो तक जोड़ सकते हैं।`,
        ),
      );
      return;
    }
    setBusy(true);
    const next = [...images];
    try {
      for (const file of files.slice(0, room)) {
        const url = await uploadReviewPhoto(file);
        next.push(url);
        onChange([...next]); // surface each upload as it lands
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t("Upload failed. Try again.", "अपलोड विफल। पुनः प्रयास करें।"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-maroon">
        {t("Add photos (optional)", "फ़ोटो जोड़ें (वैकल्पिक)")}
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {images.map((url) => (
          <div key={url} className={thumbBox}>
            <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            <button
              type="button"
              onClick={() => onChange(images.filter((u) => u !== url))}
              aria-label={t("Remove photo", "फ़ोटो हटाएं")}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-maroon text-cream shadow-sm"
            >
              <span aria-hidden="true" className="text-xs leading-none">×</span>
            </button>
          </div>
        ))}
        {images.length < REVIEW_IMAGES_MAX && (
          <label
            className={
              "flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-cream-3 text-maroon transition-colors hover:bg-cream-2 " +
              (busy ? "pointer-events-none opacity-60" : "")
            }
          >
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={onPick}
              disabled={busy}
            />
            <span aria-hidden="true" className="text-lg leading-none">
              {busy ? "…" : "+"}
            </span>
            <span className="text-[10px] font-medium">
              {busy ? t("Uploading", "अपलोड") : t("Add", "जोड़ें")}
            </span>
          </label>
        )}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-maroon">{error}</p>}
    </div>
  );
}

export function ReviewPhotoStrip({ images }: { images?: string[] }) {
  const { t } = useLang();
  if (!images?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("Open review photo", "समीक्षा फ़ोटो खोलें")}
          className={thumbBox + " transition-transform hover:scale-105"}
        >
          <Image
            src={url}
            alt={t("Review photo", "समीक्षा फ़ोटो")}
            fill
            sizes="64px"
            className="object-cover"
          />
        </a>
      ))}
    </div>
  );
}
