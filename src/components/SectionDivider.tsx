/**
 * Elegant, brand-consistent divider placed between homepage sections.
 * A centered diamond motif flanked by hairlines that fade out to each side —
 * built entirely from the brand maroon (alpha-only variation for the fades).
 */
export default function SectionDivider({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`mx-auto flex max-w-5xl items-center gap-4 px-5 ${className}`}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-maroon/25 to-maroon/40" />
      <span className="flex items-center gap-2 text-maroon">
        <span className="h-1 w-1 rounded-full bg-maroon/40" />
        <span className="h-2 w-2 rotate-45 border border-maroon/60" />
        <span className="h-2.5 w-2.5 rotate-45 bg-maroon" />
        <span className="h-2 w-2 rotate-45 border border-maroon/60" />
        <span className="h-1 w-1 rounded-full bg-maroon/40" />
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-maroon/25 to-maroon/40" />
    </div>
  );
}
