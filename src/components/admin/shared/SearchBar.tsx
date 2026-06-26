import { Search } from "./icons";

/**
 * Controlled search input. Stateless (value/onChange owned by the parent) so it
 * works with client filtering now and a `?q=` server query later.
 */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: SearchBarProps) {
  return (
    <label className={"relative block " + className}>
      <span className="sr-only">Search</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-cream-3 bg-cream/40 py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-soft/60 outline-none transition-colors focus:border-maroon focus:ring-1 focus:ring-maroon/30"
      />
    </label>
  );
}
