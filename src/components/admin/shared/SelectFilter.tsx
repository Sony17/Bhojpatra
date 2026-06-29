/**
 * Controlled select filter. Reusable across all list pages — the parent owns the
 * value, so it maps cleanly to a future query param.
 */
import ThemedSelect from "@/components/ThemedSelect";

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
      <ThemedSelect
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel={label}
        className="min-w-[10rem]"
        buttonClassName="rounded-lg border border-cream-3 bg-cream/40 px-3 py-2.5 text-sm transition-colors"
      />
    </label>
  );
}
