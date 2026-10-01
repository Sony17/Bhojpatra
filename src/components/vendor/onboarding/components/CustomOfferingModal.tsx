"use client";

import { useState } from "react";
import type { VendorCustomOffering } from "@/lib/vendorMenus";
import { Button } from "@/components/ui";

interface CustomOfferingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offering: VendorCustomOffering) => void;
}

const ICONS = ["🍢", "🍲", "🍳", "🔥", "🍹", "☕", "🍕", "🍨", "🧁", "🎁", "✨", "🍽️"];

export default function CustomOfferingModal({
  isOpen,
  onClose,
  onSave,
}: CustomOfferingModalProps) {
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🍢");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for this offering.");
      return;
    }
    if (!blurb.trim()) {
      setError("Please add a short description of the station or service.");
      return;
    }

    const newOffering: VendorCustomOffering = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      blurb: blurb.trim(),
      icon: selectedIcon,
    };

    onSave(newOffering);
    setTitle("");
    setBlurb("");
    setSelectedIcon("🍢");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-card bg-cream p-6 shadow-xl border border-cream-3">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-cream-2 hover:text-ink transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <h3 className="text-lg font-bold text-ink">Add Custom Station / Offering</h3>
        <p className="mt-1 text-xs text-ink-soft">
          Declare special live counters, signature stations, or unique experiences your team delivers.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">
              Select Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`h-9 w-9 rounded-control text-lg flex items-center justify-center border transition-all ${
                    selectedIcon === icon
                      ? "border-maroon bg-white shadow-xs scale-105"
                      : "border-cream-3 bg-white/60 hover:bg-white text-ink-soft"
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Station / Offering Title <span className="text-maroon">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Awadhi Saffron Sheermal Counter"
              className="w-full rounded-control border border-cream-3 bg-white/70 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">
              Short Description <span className="text-maroon">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={blurb}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="e.g. Live charcoal tandoor baking warm saffron sheermals on-site with pistachios and malai."
              className="w-full rounded-control border border-cream-3 bg-white/70 px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 outline-none focus:border-maroon focus:ring-1 focus:ring-maroon/30"
            />
          </div>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add Station
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
