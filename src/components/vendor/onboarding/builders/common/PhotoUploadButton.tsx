"use client";

import { useState, useRef, ChangeEvent } from "react";
import Image from "next/image";

interface PhotoUploadButtonProps {
  currentPhoto?: string;
  kind?: "card" | "dish" | "gallery";
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved?: () => void;
  label?: string;
  aspectRatio?: "square" | "landscape" | "banner";
  className?: string;
  helperText?: string;
}

export default function PhotoUploadButton({
  currentPhoto,
  kind = "dish",
  onPhotoUploaded,
  onPhotoRemoved,
  label = "Upload Photo",
  aspectRatio = "square",
  className = "",
  helperText = "JPG, PNG or WebP · Max 5 MB",
}: PhotoUploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);

      const res = await fetch("/api/vendor/photo", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Failed to upload photo.");
      } else {
        onPhotoUploaded(data.url);
      }
    } catch {
      setError("Network error while uploading photo.");
    } finally {
      setUploading(false);
    }
  };

  const aspectClass =
    aspectRatio === "banner"
      ? "aspect-[21/9] w-full"
      : aspectRatio === "landscape"
        ? "aspect-[16/9] w-full"
        : "aspect-square w-28 sm:w-32";

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label={label}
      />

      {currentPhoto ? (
        <div className={`relative overflow-hidden rounded-control border border-cream-3 bg-cream-1 group ${aspectClass}`}>
          <Image
            src={currentPhoto}
            alt="Uploaded preview"
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized={currentPhoto.startsWith("/api/vendor/photo")}
          />
          <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="min-h-[44px] min-w-[44px] rounded-control bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink shadow-sm hover:bg-white active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              {uploading ? "..." : "Change"}
            </button>
            {onPhotoRemoved && (
              <button
                type="button"
                onClick={onPhotoRemoved}
                disabled={uploading}
                className="min-h-[44px] min-w-[44px] rounded-control bg-maroon/95 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all flex items-center justify-center"
                title="Remove photo"
                aria-label="Remove photo"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`flex min-h-[44px] flex-col items-center justify-center rounded-control border-2 border-dashed border-cream-3 bg-cream-1/60 p-4 text-center transition-all hover:border-maroon/50 hover:bg-cream-1 active:scale-[0.99] ${aspectClass}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-maroon border-t-transparent" />
              <span className="text-xs text-ink-soft">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-2xl" aria-hidden="true">
                📷
              </span>
              <span className="text-xs font-semibold text-ink">{label}</span>
              <span className="text-[10px] text-ink-soft">{helperText}</span>
            </div>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-maroon" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
