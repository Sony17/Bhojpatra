/**
 * Controlled select filter. Reusable across all list pages — the parent owns the
 * value, so it maps cleanly to a future query param.
 */
export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFilterProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

export default function SelectFilter({
  label,
  value,
  options,
  onChange,
  className = "",
}: SelectFilterProps) {
  return (
    <label className={"flex items-center gap-2 " + className}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
