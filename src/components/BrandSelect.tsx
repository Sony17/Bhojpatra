"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, MapPin } from "@/components/icons";
import { useLang } from "@/lib/i18n";

type Option = { id: string; name: string; nameHi?: string };

type IconKey = "calendar" | "mapPin" | "chevron";

const icons = {
  calendar: Calendar,
  mapPin: MapPin,
  chevron: ChevronDown,
} as const;

export default function BrandSelect({
  options,
  placeholder,
  ariaLabel,
  icon,
  className = "",
  buttonClassName = "px-5 py-3.5 pr-11 text-sm",
  iconClassName = "right-4",
  direction = "down",
  align = "left",
  menuClassName = "",
  defaultId,
  valueId,
  displayLabel,
  onChange,
  actionLabel,
  onAction,
  actionDisabled = false,
}: {
  options: Option[];
  placeholder: string;
  ariaLabel: string;
  icon: IconKey;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  direction?: "up" | "down";
  /** Horizontal anchor for the popup — keeps a wide menu on-screen when the
   *  trigger is narrow (e.g. the compact mobile hero fields). */
  align?: "left" | "center" | "right";
  /** Extra classes for the open menu (e.g. `w-full` to match the trigger). */
  menuClassName?: string;
  /** Pre-select the option with this id on first render. */
  defaultId?: string;
  /** Controlled selection — updates the displayed value when this changes. */
  valueId?: string;
  /** Override the button label (e.g. show a custom city instead of "Other"). */
  displayLabel?: string;
  /** Fired with the chosen option whenever the selection changes. */
  onChange?: (option: Option) => void;
  /** Optional highlighted action pinned to the top of the open menu
   *  (e.g. "Use my current location"). Rendered only when `onAction` is set. */
  actionLabel?: string;
  onAction?: () => void;
  /** Disable the pinned action (e.g. while a GPS lookup is already running). */
  actionDisabled?: boolean;
}) {
  const Icon = icons[icon];
  const { lang } = useLang();
  const label = (o: Option) => (lang === "hi" && o.nameHi ? o.nameHi : o.name);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Option | null>(
    () =>
      options.find((o) => o.id === (valueId ?? defaultId)) ??
      options.find((o) => o.id === defaultId) ??
      null,
  );
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (valueId === undefined) return;
    setSelected(options.find((o) => o.id === valueId) ?? null);
  }, [valueId, options]);

  // Close on outside pointerdown / Escape. Ignore events inside the menu.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(o: Option) {
    setSelected(o);
    onChange?.(o);
    setOpen(false);
  }

  const fullWidthMenu = menuClassName.includes("w-full");

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-full w-full cursor-pointer items-center rounded-2xl bg-transparent text-left outline-none ${buttonClassName} ${
          displayLabel || selected ? "text-ink" : "text-ink/60"
        }`}
      >
        <span className="truncate">
          {displayLabel || (selected ? label(selected) : placeholder)}
        </span>
      </button>

      <Icon
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-maroon/70 transition-transform duration-200 ${iconClassName} ${open ? "rotate-180" : ""}`}
      />

      {open && (
        <ul
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-[100] max-h-64 overflow-auto rounded-xl border border-maroon/15 bg-white py-1 shadow-pop ${
            menuClassName || "w-52 max-w-[calc(100vw-2.5rem)]"
          } ${
            fullWidthMenu
              ? "left-0 right-0"
              : align === "right"
                ? "right-0"
                : align === "center"
                  ? "left-1/2 -ml-[6.5rem]"
                  : "left-0"
          } ${
            direction === "up"
              ? "bottom-[calc(100%+0.35rem)]"
              : "top-[calc(100%+0.35rem)]"
          }`}
        >
          {actionLabel && onAction && (
            <li>
              <button
                type="button"
                disabled={actionDisabled}
                onPointerDown={(e) => {
                  if (actionDisabled) return;
                  e.preventDefault();
                  onAction();
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                  actionDisabled
                    ? "cursor-default text-maroon/50"
                    : "text-maroon hover:bg-cream/50"
                }`}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{actionLabel}</span>
              </button>
              <div aria-hidden className="mx-3 my-0.5 h-px bg-maroon/10" />
            </li>
          )}
          {options.map((o) => {
            const isSel = selected?.id === o.id;
            return (
              <li key={o.id} role="option" aria-selected={isSel}>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    pick(o);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-[13px] transition-colors ${
                    isSel
                      ? "bg-cream/70 font-medium text-ink"
                      : "text-ink hover:bg-cream/40"
                  }`}
                >
                  <span className="truncate">{label(o)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
