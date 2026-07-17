"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "@/components/icons";

export type ThemedSelectOption = { value: string; label: string };

/**
 * Controlled, theme-styled replacement for a native <select>. Renders the same
 * cream/red popup as BrandSelect so every dropdown in the app looks on-brand
 * instead of falling back to the grey OS menu.
 *
 * API mirrors a native select: pass `value` + `onChange(value)` and an
 * `options` list. A `placeholder` is shown when no option is selected, and an
 * optional `name` renders a hidden input so the value still posts with a form.
 */
export default function ThemedSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  id,
  name,
  required,
  disabled,
  className = "",
  buttonClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: ThemedSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Classes for the trigger button — pass the styling the <select> used. */
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Decide whether to flip the panel above the trigger when near the viewport
  // bottom (forms often sit low on the page).
  function openMenu() {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 280 && rect.top > spaceBelow);
    }
    setActiveIndex(options.findIndex((o) => o.value === value));
    setOpen(true);
  }

  function commit(option: ThemedSelectOption) {
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onButtonKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      setActiveIndex((i) => {
        const next = e.key === "ArrowDown" ? i + 1 : i - 1;
        return (next + options.length) % options.length;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) openMenu();
      else if (activeIndex >= 0) commit(options[activeIndex]);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onButtonKeyDown}
        className={`flex min-w-0 cursor-pointer items-center justify-between gap-1.5 text-left outline-none disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName} ${
          selected ? "text-ink" : "text-ink/55"
        }`}
      >
        <span className="truncate">
          {selected ? selected.label : placeholder ?? ""}
        </span>
        <ChevronDown
          className={`pointer-events-none h-4 w-4 shrink-0 text-maroon/70 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={`animate-rise absolute left-0 right-0 z-50 max-h-72 overflow-auto rounded-2xl border border-maroon/40 bg-white p-1.5 shadow-[0_20px_50px_-12px_rgba(185,32,37,0.35)] ${
            dropUp ? "bottom-[calc(100%+0.5rem)]" : "top-[calc(100%+0.5rem)]"
          }`}
        >
          {options.map((o, i) => {
            const isSel = o.value === value;
            const isActive = i === activeIndex;
            return (
              <li key={o.value} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  onClick={() => commit(o)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                    isSel
                      ? "bg-cream text-ink"
                      : isActive
                        ? "bg-cream/60 text-ink"
                        : "text-ink hover:bg-cream/60"
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
