"use client";

import { useState, useRef, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";

interface PhotoUploadButtonProps {
  currentPhoto?: string;
  kind?: "card" | "dish" | "gallery";
  onPhotoUploaded: (url: string) => void;
  onPhotoRemoved?: () => void;
  /** Text on the `.btn-upload-photo` button. */
  label?: string;
  aspectRatio?: "square" | "landscape" | "banner";
  className?: string;
  /** Rendered as `.photo-upload-desc`. */
  helperText?: string;
  /** Optional `.photo-upload-title` line (mockup: "Feast Cover Photography"). */
  title?: ReactNode;
}

/** Thumb sizes per aspect — landscape is the mockup's default 90×70. */
const THUMB_SIZE: Record<NonNullable<PhotoUploadButtonProps["aspectRatio"]>, CSSProperties> = {
  square: { width: 70, height: 70 },
  landscape: { width: 90, height: 70 },
  banner: { width: 140, height: 60 },
};

/**
 * Real photo upload (POST /api/vendor/photo) dressed as the handover's
 * `.photo-uploader-box` (thumb + title/desc + "Change Photo 📷" pill).
 */
export default function PhotoUploadButton({
  currentPhoto,
  kind = "dish",
  onPhotoUploaded,
  onPhotoRemoved,
  label = "Upload Photo",
  aspectRatio = "square",
  className = "",
  helperText = "JPG, PNG or WebP · Max 5 MB",
  title,
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

  const thumb = THUMB_SIZE[aspectRatio];
  const buttonText =
    uploading ? "Uploading..." : currentPhoto && label === "Upload Photo" ? "Change Photo 📷" : label;

  return (
    <div className={`photo-uploader-box ${className}`.trim()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: "none" }}
        aria-label={label}
      />

      {currentPhoto ? (
        <Image
          src={currentPhoto}
          alt="Uploaded preview"
          width={Number(thumb.width)}
          height={Number(thumb.height)}
          unoptimized
          className="photo-preview-thumb"
          style={thumb}
        />
      ) : (
        <button
          type="button"
          className="photo-preview-thumb"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label={label}
          style={{
            ...thumb,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            background: "var(--color-cream-10)",
            border: "1px dashed var(--color-cream)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <span aria-hidden="true">📷</span>
        </button>
      )}

      <div className="photo-upload-meta">
        {title && <div className="photo-upload-title">{title}</div>}
        {helperText && <div className="photo-upload-desc">{helperText}</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button
            type="button"
            className="btn-upload-photo"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {buttonText}
          </button>
          {currentPhoto && onPhotoRemoved && (
            <button
              type="button"
              className="btn-upload-photo"
              onClick={onPhotoRemoved}
              disabled={uploading}
              aria-label="Remove photo"
              title="Remove photo"
            >
              ✕ Remove
            </button>
          )}
        </div>
        {error && (
          <span className="vob-field-error" role="alert">
            ⚠️ {error}
          </span>
        )}
      </div>
    </div>
  );
}
